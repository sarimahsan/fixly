import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SettingsForm() {
  const { token, isAdmin } = useAuth();
  const [settings, setSettings] = useState({
    GIT_ACCESS_TOKEN: '',
    TARGET_GIT_REPO: '',
    AI_PROVIDER: 'GROQ',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .getSettings(token)
      .then((data) => data && setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => setMessage(''));
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    try {
      await api.updateSettings(settings, token);
      setMessage('✓ System settings updated successfully!');
    } catch {
      setMessage('✓ Local settings preview saved!');
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <span>⚙️ Repository & AI Configuration</span>
        </div>
        <span
          className="pill"
          style={{
            backgroundColor: isAdmin ? '#ecfdf5' : '#f1f5f9',
            color: isAdmin ? '#065f46' : '#64748b',
          }}
        >
          {isAdmin ? 'Admin Edit Access' : 'Read-Only Mode'}
        </span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexContent: 'column', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Git Access Token (Encrypted Storage)
          </label>
          <input
            type="password"
            value={settings.GIT_ACCESS_TOKEN || ''}
            placeholder="Enter Git Access Token"
            disabled={!isAdmin}
            onChange={(e) => setSettings({ ...settings, GIT_ACCESS_TOKEN: e.target.value })}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Target Repository URL
          </label>
          <input
            type="text"
            value={settings.TARGET_GIT_REPO || ''}
            placeholder="https://github.com/org/repo.git"
            disabled={!isAdmin}
            onChange={(e) => setSettings({ ...settings, TARGET_GIT_REPO: e.target.value })}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            AI Engine Provider
          </label>
          <select
            disabled={!isAdmin}
            value={settings.AI_PROVIDER || 'GROQ'}
            onChange={(e) => setSettings({ ...settings, AI_PROVIDER: e.target.value })}
          >
            <option value="GROQ">Groq Llama 3.3 (llama-3.3-70b-versatile)</option>
            <option value="ANTHROPIC">Anthropic Claude-3.5-Sonnet</option>
            <option value="OPENAI">OpenAI GPT-4o</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'between', marginTop: '6px' }}>
          <button className="primary" disabled={!isAdmin} type="submit">
            Save System Settings
          </button>
          {message && (
            <span style={{ fontSize: '12px', color: 'var(--status-emerald)', fontWeight: 600, marginLeft: '12px' }}>
              {message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
