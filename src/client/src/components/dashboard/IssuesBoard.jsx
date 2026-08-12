import AdminOnly from '../rbac/AdminOnly.jsx';

const columns = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export default function IssuesBoard({ incidents, onResolve, onDiff }) {
  return <section className="card board"><div className="card-title"><h2>Tracked issues</h2><small>{incidents.length} incidents</small></div><div className="columns">{columns.map((status) => <div className="column" key={status}><h3>{status.replace('_', ' ')}</h3>{incidents.filter((i) => i.status === status).map((incident) => <article className="issue" key={incident.id}><span className={`pill ${String(incident.severity || 'LOW').toLowerCase()}`}>{incident.severity || 'LOW'}</span><h4>{incident.title || incident.normalizedMessage}</h4><p>{incident.occurrenceCount || 1} occurrences · last seen {incident.lastSeenAt ? new Date(incident.lastSeenAt).toLocaleTimeString() : 'n/a'}</p><div className="actions"><button onClick={() => onDiff(incident)}>View diff</button><AdminOnly fallback={<span className="muted small">Admin required to resolve</span>}>{incident.status !== 'RESOLVED' && <button className="primary" onClick={() => onResolve(incident)}>Resolve</button>}</AdminOnly></div></article>))}</div>)}</div></section>;
}
