const crypto = require('crypto');

function summarize(files) {
  const ok = files.filter((f) => !f.skipped);
  const funcs = ok.flatMap((f) => f.functions);
  const risks = ok.map((f) => f.risk);
  const smells = ok.reduce((n, f) => n + f.smells.length + f.functions.reduce((m, fn) => m + fn.smells.length, 0), 0);
  return {
    files: ok.length,
    functions: funcs.length,
    avgRisk: risks.length ? +(risks.reduce((a, b) => a + b, 0) / risks.length).toFixed(3) : 0,
    maxRisk: risks.length ? Math.max(...risks) : 0,
    highRisk: funcs.filter((fn) => fn.level === 'high').length,
    smells,
  };
}

const cacheKey = (code, smells) =>
  crypto.createHash('sha256').update(code + JSON.stringify((smells || []).map((s) => [s.type, s.severity]))).digest('hex');

function parseLlmJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('LLM returned no JSON');
  const data = JSON.parse(cleaned.slice(start, end + 1));
  const issues = Array.isArray(data.issues) ? data.issues : [];
  return {
    summary: String(data.summary || ''),
    issues: issues.map((i) => ({
      issue: String(i.issue || ''),
      why: String(i.why || ''),
      severity: ['low', 'medium', 'high'].includes(i.severity) ? i.severity : 'medium',
      fixed_code: String(i.fixed_code || ''),
    })),
  };
}

module.exports = { summarize, cacheKey, parseLlmJson };
