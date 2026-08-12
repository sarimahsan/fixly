const severityClass = (severity) => `pill ${String(severity || 'LOW').toLowerCase()}`;

export default function LiveFeed({ events, connected }) {
  return <section className="card live-feed"><div className="card-title"><h2>Live incident feed</h2><span className={connected ? 'online' : 'offline'}>{connected ? 'Live' : 'Offline'}</span></div>{events.length === 0 ? <p className="muted">No live events yet.</p> : events.map((item) => <article className="feed-item" key={item.key}><span className={severityClass(item.payload?.severity)}>{item.payload?.severity || item.event}</span><div><strong>{item.payload?.title || item.payload?.normalizedMessage || item.event}</strong><p>{new Date(item.timestamp).toLocaleString()} · {item.payload?.status || 'streamed'}</p></div></article>)}</section>;
}
