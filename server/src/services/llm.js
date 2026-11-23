const { anthropicKey, llmModel } = require('../config');
const { parseLlmJson } = require('./util');

const SYSTEM = `You are a senior software engineer doing a code review.
You receive one function, its static-analysis metrics, a bug-risk score and detected code smells.
Respond with ONLY valid JSON, no markdown, in this shape:
{"summary": string, "issues": [{"issue": string, "why": string, "severity": "low"|"medium"|"high", "fixed_code": string}]}
Rules: give at most 3 issues, most important first. "fixed_code" must be the complete refactored function (same name and behaviour, same language), not a fragment. Do not invent code that is not in the input.`;

const ADVICE = {
  long_method: 'Split the function into smaller, single-purpose helpers.',
  high_complexity: 'Replace nested conditionals with early returns, lookup tables or strategy functions.',
  deep_nesting: 'Use guard clauses and extract inner blocks into named functions.',
  long_parameter_list: 'Group related parameters into an options object or dataclass.',
  magic_numbers: 'Move literals into named constants.',
  empty_catch: 'Log or handle the error instead of swallowing it.',
  debug_output: 'Remove debug output or use a proper logger.',
  duplicate_code: 'Extract the repeated block into a shared function.',
  god_class: 'Split the class by responsibility.',
};

function rulesFallback(smells, note) {
  const issues = smells.map((s) => ({
    issue: s.type.replace(/_/g, ' '), why: s.message, severity: s.severity,
    fixed_code: '', hint: ADVICE[s.type] || '',
  }));
  return { summary: note, issues, source: 'rules' };
}

function buildPrompt({ language, code, metrics, smells, risk }) {
  return `Language: ${language}\nBug risk: ${(risk * 100).toFixed(0)}%\nMetrics: ${JSON.stringify(metrics)}\n` +
    `Detected smells: ${JSON.stringify(smells.map((s) => ({ type: s.type, severity: s.severity, message: s.message })))}\n\n` +
    `Function:\n${code}`;
}

async function suggest(input) {
  if (!anthropicKey) {
    return rulesFallback(input.smells, 'No LLM key configured, showing rule-based advice. Set ANTHROPIC_API_KEY for AI-written fixes.');
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: llmModel, max_tokens: 2500, system: SYSTEM,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`LLM API ${res.status}`);
    const data = await res.json();
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return { ...parseLlmJson(text), source: 'llm', model: llmModel };
  } catch (err) {
    console.error('LLM failed:', err.message);
    return rulesFallback(input.smells, 'The AI service was unavailable, showing rule-based advice instead.');
  }
}

module.exports = { suggest, buildPrompt, rulesFallback };
