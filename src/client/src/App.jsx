import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { api } from './api.js';
import { useFixlySocket } from './hooks/useFixlySocket.js';
import { sampleIncidents, upsertIncident } from './utils/incidentState.js';
import LiveFeed from './components/dashboard/LiveFeed.jsx';
import ServerVitalsWidget from './components/dashboard/ServerVitalsWidget.jsx';
import IssuesBoard from './components/dashboard/IssuesBoard.jsx';
import ResolveModal from './components/dashboard/ResolveModal.jsx';
import DiffViewer from './components/dashboard/DiffViewer.jsx';
import HistoryList from './components/dashboard/HistoryList.jsx';
import SettingsForm from './components/settings/SettingsForm.jsx';

function Dashboard() {
  const { token, user, switchRole } = useAuth();
  const [incidents, setIncidents] = useState(sampleIncidents);
  const [events, setEvents] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [diffTarget, setDiffTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const connected = useFixlySocket((message) => {
    setEvents((items) => [{ ...message, key: `${message.event}-${Date.now()}` }, ...items].slice(0, 15));
    if (message.event === 'vitals:updated') setVitals(message.payload);
    if (['incident:created', 'incident:updated', 'diagnosis:created', 'fix:proposed', 'incident:resolved'].includes(message.event)) {
      setIncidents((items) => upsertIncident(items, message.payload));
    }
  });

  useEffect(() => {
    api
      .listIncidents(token)
      .then((data) => Array.isArray(data) && setIncidents(data))
      .catch(() => null);
  }, [token]);

  const resolveIncident = async (incident, notes) => {
    try {
      await api.resolveIncident(incident.id, notes, token);
    } catch {}
    setIncidents((items) =>
      upsertIncident(items, {
        id: incident.id,
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedByType: 'HUMAN',
        resolutionNotes: notes,
      })
    );
    setResolveTarget(null);
  };

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="brand-logo">
            <div className="brand-icon">F</div>
            <span className="brand-name">Fixly</span>
          </div>

          <div className="nav-section">
            <div className="nav-label">Main Views</div>
            <div
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </div>
            <div
              className={`nav-item ${activeTab === 'issues' ? 'active' : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              🐛 Tracked Incidents
            </div>
            <div
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 Resolution History
            </div>
            <div
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ System Settings
            </div>
          </div>
        </div>

        {/* Persona Switcher Widget */}
        <div className="sidebar-persona">
          <label>Active Persona</label>
          <select
            value={user?.role || 'ADMIN'}
            onChange={(e) => switchRole && switchRole(e.target.value)}
          >
            <option value="ADMIN">Alex Mercer (ADMIN)</option>
            <option value="OPERATOR">DevOps Engineer (OPERATOR)</option>
            <option value="READ_ONLY">Auditor (READ_ONLY)</option>
          </select>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* NAVBAR HEADER */}
        <header className="navbar-header">
          <div className="navbar-title">
            <h1>Autonomous Incident Detection & Self-Healing</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="target-badge">
              <span className="pulse-dot"></span>
              Target: <strong>prod-ec2 (16.192.151.190)</strong>
            </div>

            <div className="user-badge">
              <div className="user-avatar">AM</div>
              <div className="user-info">
                <span className="user-name">{user?.email || 'alex.mercer@fixly.local'}</span>
                <span className="user-role">{user?.role || 'ADMIN'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="content-body">
          {(activeTab === 'dashboard' || activeTab === 'issues') && (
            <>
              <div className="grid-top">
                <ServerVitalsWidget vitals={vitals} />
                <LiveFeed events={events} connected={connected} />
              </div>

              <IssuesBoard
                incidents={incidents}
                onResolve={setResolveTarget}
                onDiff={setDiffTarget}
              />
            </>
          )}

          {(activeTab === 'dashboard' || activeTab === 'history') && (
            <HistoryList incidents={incidents} onDiff={setDiffTarget} />
          )}

          {(activeTab === 'dashboard' || activeTab === 'settings') && (
            <SettingsForm />
          )}
        </div>
      </div>

      {/* MODALS */}
      <ResolveModal
        incident={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolve={resolveIncident}
      />
      <DiffViewer incident={diffTarget} onClose={() => setDiffTarget(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
