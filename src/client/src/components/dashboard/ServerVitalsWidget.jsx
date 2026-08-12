function Meter({ label, value }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const color = safe > 85 ? 'danger' : safe > 65 ? 'warn' : 'ok';
  return <div className="meter"><div className="meter-head"><span>{label}</span><b>{safe.toFixed(1)}%</b></div><div className="bar"><span className={color} style={{ width: `${safe}%` }} /></div></div>;
}

export default function ServerVitalsWidget({ vitals }) {
  return <section className="card"><div className="card-title"><h2>Server vitals</h2><small>{vitals?.timestamp ? new Date(vitals.timestamp).toLocaleTimeString() : 'Waiting for websocket data'}</small></div><Meter label="CPU" value={vitals?.cpuUsagePercent} /><Meter label="Memory" value={vitals?.memoryUsagePercent} /><Meter label="Disk" value={vitals?.diskUsagePercent} /></section>;
}
