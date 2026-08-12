export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, { token, ...options } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Request failed: ${res.status}`);
  return res.json();
}

export const api = {
  getServer: () => request('/api/server'),
  getVitals: () => request('/api/vitals'),
  listIncidents: (token) => request('/api/incidents', { token }),
  resolveIncident: (id, resolutionNotes, token) => request(`/api/incidents/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolutionNotes }), token }),
  getSettings: (token) => request('/api/settings', { token }),
  updateSettings: (settings, token) => request('/api/settings', { method: 'PUT', body: JSON.stringify(settings), token }),
  signup: (email, password, fullName) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),
  login: (email, password, code) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, code }) }),
  setup2fa: (token) => request('/api/auth/2fa/setup', { method: 'POST', token }),
  verify2fa: (code, token) => request('/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }), token }),
  getMe: (token) => request('/api/auth/me', { token })
};

export function wsUrl() {
  const base = import.meta.env.VITE_WS_URL;
  if (base) return base;
  return 'ws://localhost:5000/ws';
}
