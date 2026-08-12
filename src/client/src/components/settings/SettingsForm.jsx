import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SettingsForm() {
  const { token, isAdmin } = useAuth();
  const [settings, setSettings] = useState({ GIT_ACCESS_TOKEN: '', AI_PROVIDER: 'GROQ' });
  const [message, setMessage] = useState('');

  useEffect(() => { api.getSettings(token).then(setSettings).catch(() => setMessage('Using local settings preview.')); }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    await api.updateSettings(settings, token);
    setMessage('Settings saved. Token will be masked on next load.');
  };

  return <section className="card"><div className="card-title"><h2>Repository & AI settings</h2><small>{isAdmin ? 'Admin access' : 'Read only'}</small></div><form onSubmit={submit} className="settings"><label>Git access token<input type="password" value={settings.GIT_ACCESS_TOKEN || ''} placeholder="ghp_****1234" disabled={!isAdmin} onChange={(e) => setSettings({ ...settings, GIT_ACCESS_TOKEN: e.target.value })} /></label><label>AI provider<select disabled={!isAdmin} value={settings.AI_PROVIDER || 'GROQ'} onChange={(e) => setSettings({ ...settings, AI_PROVIDER: e.target.value })}><option>GROQ</option><option>ANTHROPIC</option><option>OPENAI</option></select></label><button className="primary" disabled={!isAdmin}>Save settings</button>{message && <p className="muted">{message}</p>}</form></section>;
}
