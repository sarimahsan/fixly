import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  History,
  Settings,
  Server,
  Activity
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { api } from './api.js';
import { useFixlySocket } from './hooks/useFixlySocket.js';
import { upsertIncident } from './utils/incidentState.js';
import LiveFeed from './components/dashboard/LiveFeed.jsx';
import ServerVitalsWidget from './components/dashboard/ServerVitalsWidget.jsx';
import IssuesBoard from './components/dashboard/IssuesBoard.jsx';
import ResolveModal from './components/dashboard/ResolveModal.jsx';
import DiffViewer from './components/dashboard/DiffViewer.jsx';
import HistoryList from './components/dashboard/HistoryList.jsx';
import SettingsForm from './components/settings/SettingsForm.jsx';

function Dashboard() {
  const { token, user, switchRole } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [diffTarget, setDiffTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const connected = useFixlySocket((message) => {
    if (message.event === 'vitals:updated') {
      setVitals(message.payload);
      return;
    }
    // Handle status updates and log events
    if (['incident:created', 'incident:updated', 'log:error', 'diagnosis:created', 'fix:proposed', 'incident:resolved'].includes(message.event)) {
      setEvents((items) => [
        { ...message, key: `${message.event}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` },
        ...items,
      ].slice(0, 40));

      if (message.payload && typeof message.payload === 'object' && (message.payload.id || message.payload.incidentId)) {
        setIncidents((items) => upsertIncident(items, message.payload));
      }
    }
  });

  useEffect(() => {
    // Fetch live incidents from database
    api
      .listIncidents(token)
      .then((data) => Array.isArray(data) && setIncidents(data))
      .catch(() => setIncidents([]));

    // Fetch active target server info
    api
      .getServer()
      .then((info) => info && setServerInfo(info))
      .catch(() => setServerInfo(null));

    // Fetch initial vitals
    api
      .getVitals()
      .then((v) => v && setVitals(v))
      .catch(() => setVitals(null));
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

  const handleDeploySuccess = (incidentId) => {
    setIncidents((items) =>
      upsertIncident(items, {
        id: incidentId,
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolvedByType: 'AI',
        resolutionNotes: 'Auto-patched code on Hostinger VPS and restarted server.',
      })
    );
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
              <LayoutDashboard size={16} /> Live Dashboard
            </div>
            <div
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} /> Resolution History
            </div>
            <div
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} /> System Settings
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

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <div className="target-badge">
              <span className="pulse-dot" style={{ backgroundColor: connected ? 'var(--status-emerald)' : 'var(--text-muted)' }}></span>
              <Server size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>Target: <strong>{serverInfo?.name ? `${serverInfo.name} (${serverInfo.host})` : 'Connecting...'}</strong></span>
            </div>

            <div className="user-badge">
              <div className="user-avatar">{user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'}</div>
              <div className="user-info">
                <span className="user-name">{user?.email || 'Authenticated User'}</span>
                <span className="user-role">{user?.role || 'OPERATOR'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="content-body">
          {activeTab === 'dashboard' && (
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

          {activeTab === 'history' && (
            <HistoryList incidents={incidents} onDiff={setDiffTarget} />
          )}

          {activeTab === 'settings' && (
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
      <DiffViewer
        incident={diffTarget}
        onClose={() => setDiffTarget(null)}
        onDeploySuccess={handleDeploySuccess}
      />
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
