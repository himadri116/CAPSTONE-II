const { summarize, cacheKey, parseLlmJson } = require('../src/services/util');
const { rulesFallback, buildPrompt } = require('../src/services/llm');

test('parseLlmJson strips fences and normalises severity', () => {
  const out = parseLlmJson('```json\n{"summary":"s","issues":[{"issue":"a","why":"b","severity":"urgent","fixed_code":"x"}]}\n```');
  expect(out.summary).toBe('s');
  expect(out.issues[0].severity).toBe('medium');
});

test('parseLlmJson rejects non JSON', () => {
  expect(() => parseLlmJson('sorry')).toThrow();
});

test('summarize counts files, high risk functions and smells', () => {
  const s = summarize([
    { risk: 0.8, smells: [{}], functions: [{ level: 'high', smells: [{}, {}] }, { level: 'low', smells: [] }] },
    { skipped: true },
  ]);
  expect(s).toMatchObject({ files: 1, functions: 2, highRisk: 1, smells: 3, maxRisk: 0.8 });
});

test('cacheKey is stable and sensitive to code', () => {
  expect(cacheKey('a', [])).toBe(cacheKey('a', []));
  expect(cacheKey('a', [])).not.toBe(cacheKey('b', []));
});

test('rules fallback maps smells to issues; prompt includes code', () => {
  const r = rulesFallback([{ type: 'deep_nesting', severity: 'medium', message: 'm' }], 'note');
  expect(r.source).toBe('rules');
  expect(r.issues[0].hint).toMatch(/guard/);
  expect(buildPrompt({ language: 'python', code: 'def f(): pass', metrics: {}, smells: [], risk: 0.5 })).toContain('def f(): pass');
});
