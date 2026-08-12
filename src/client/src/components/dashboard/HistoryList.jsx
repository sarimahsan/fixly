export default function HistoryList({ incidents, onDiff }) {
  const resolved = incidents.filter((incident) => incident.status === 'RESOLVED');
  return <section className="card"><div className="card-title"><h2>Resolution history</h2><small>{resolved.length} resolved</small></div>{resolved.length === 0 ? <p className="muted">No resolved incidents yet.</p> : resolved.map((incident) => <article className="history" key={incident.id}><div><strong>{incident.title}</strong><p>{incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Recently'} · {incident.resolvedByType || 'HUMAN'}</p><p className="muted">{incident.resolutionNotes}</p></div><button onClick={() => onDiff(incident)}>Diff</button></article>)}</section>;
}
