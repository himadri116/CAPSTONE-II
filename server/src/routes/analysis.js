const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/auth');
const Analysis = require('../models/Analysis');
const Suggestion = require('../models/Suggestion');
const ml = require('../services/ml');
const llm = require('../services/llm');
const { summarize, cacheKey } = require('../services/util');

const ALLOWED = new Set(['.py', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.java', '.go', '.c', '.cpp', '.cs']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 30 } });

router.use(requireAuth);

router.post('/', upload.array('files', 30), async (req, res) => {
  try {
    const files = (req.files || [])
      .filter((f) => ALLOWED.has(path.extname(f.originalname).toLowerCase()))
      .map((f) => ({ path: f.originalname, content: f.buffer.toString('utf8') }));
    if (req.body.code && req.body.code.trim()) {
      const filename = path.basename(req.body.filename || 'snippet.py');
      if (ALLOWED.has(path.extname(filename).toLowerCase())) files.push({ path: filename, content: req.body.code });
    }
    if (!files.length) return res.status(400).json({ error: 'Provide code or upload at least one supported source file.' });

    const result = await ml.analyze(files);
    const doc = await Analysis.create({
      user: req.user.id, name: (req.body.name || '').slice(0, 80) || `Analysis of ${files.length} file(s)`,
      mlModel: result.model, summary: summarize(result.files), files: result.files,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Analysis failed. Is the ML service running?' });
  }
});

router.get('/', async (req, res) => {
  const list = await Analysis.find({ user: req.user.id }).select('name summary createdAt mlModel').sort({ createdAt: -1 }).limit(100);
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const doc = await Analysis.findOne({ _id: req.params.id, user: req.user.id }).catch(() => null);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.delete('/:id', async (req, res) => {
  await Analysis.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ ok: true });
});

router.post('/:id/suggest', async (req, res) => {
  const doc = await Analysis.findOne({ _id: req.params.id, user: req.user.id }).catch(() => null);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const file = doc.files.find((f) => f.path === req.body.filePath);
  const fn = file && file.functions.find((x) => x.start === req.body.start && x.name === req.body.name);
  if (!fn) return res.status(404).json({ error: 'Function not found in this analysis' });

  const key = cacheKey(fn.code, fn.smells);
  const cached = await Suggestion.findOne({ key });
  if (cached) return res.json({ ...cached.result, cached: true });

  const result = await llm.suggest({ language: file.language, code: fn.code, metrics: fn.metrics, smells: fn.smells, risk: fn.risk });
  if (result.source === 'llm') await Suggestion.create({ key, result }).catch(() => {});
  res.json(result);
});

module.exports = router;
