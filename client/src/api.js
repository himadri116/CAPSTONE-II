async function request(path, opts = {}) {
  const res = await fetch(`/api${path}`, { credentials: 'include', ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}
const json = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  config: () => request('/auth/config'),
  me: () => request('/auth/me'),
  devLogin: () => request('/auth/dev', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  list: () => request('/analyses'),
  get: (id) => request(`/analyses/${id}`),
  remove: (id) => request(`/analyses/${id}`, { method: 'DELETE' }),
  create: (formData) => request('/analyses', { method: 'POST', body: formData }),
  suggest: (id, body) => request(`/analyses/${id}/suggest`, json(body)),
};

// 0 → green, 1 → red
export const riskColor = (r) => `hsl(${Math.round(140 - 135 * Math.min(Math.max(r, 0), 1))} 48% 58%)`;
export const pct = (r) => `${Math.round(r * 100)}%`;
