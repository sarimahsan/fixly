import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
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
import { useAuth } from './context/AuthContext.jsx';

function Dashboard() {
  const { token, user } = useAuth();
  const [incidents, setIncidents] = useState(sampleIncidents);
  const [events, setEvents] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [diffTarget, setDiffTarget] = useState(null);

  const connected = useFixlySocket((message) => {
    setEvents((items) => [{ ...message, key: `${message.event}-${Date.now()}` }, ...items].slice(0, 12));
    if (message.event === 'vitals:updated') setVitals(message.payload);
    if (['incident:created', 'incident:updated', 'diagnosis:created', 'fix:proposed', 'incident:resolved'].includes(message.event)) {
      setIncidents((items) => upsertIncident(items, message.payload));
    }
  });

  useEffect(() => { api.listIncidents(token).then((data) => Array.isArray(data) && setIncidents(data)).catch(() => null); }, [token]);

  const resolveIncident = async (incident, notes) => {
    try { await api.resolveIncident(incident.id, notes, token); } catch {}
    setIncidents((items) => upsertIncident(items, { id: incident.id, status: 'RESOLVED', resolvedAt: new Date().toISOString(), resolvedByType: 'HUMAN', resolutionNotes: notes }));
    setResolveTarget(null);
  };

  return <main><header className="hero"><div><h1>Fixly Dashboard</h1><p>Live incident detection, AI fixes, and recovery history.</p></div><div className="user">{user?.email}<strong>{user?.role}</strong></div></header><div className="grid top"><ServerVitalsWidget vitals={vitals} /><LiveFeed events={events} connected={connected} /></div><IssuesBoard incidents={incidents} onResolve={setResolveTarget} onDiff={setDiffTarget} /><div className="grid"><HistoryList incidents={incidents} onDiff={setDiffTarget} /><SettingsForm /></div><ResolveModal incident={resolveTarget} onClose={() => setResolveTarget(null)} onResolve={resolveIncident} /><DiffViewer incident={diffTarget} onClose={() => setDiffTarget(null)} /></main>;
}

export default function App() {
  return <AuthProvider><Dashboard /></AuthProvider>;
}
