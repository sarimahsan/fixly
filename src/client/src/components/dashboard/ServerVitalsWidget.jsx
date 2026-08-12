import React from 'react';

function Meter({ label, value, colorClass }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="vital-metric-card">
      <div className="vital-head">
        <span>{label}</span>
        <span>{safe.toFixed(1)}%</span>
      </div>
      <div className="vital-val">{safe.toFixed(1)}%</div>
      <div className="bar-container">
        <div className={`bar-fill ${colorClass}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export default function ServerVitalsWidget({ vitals }) {
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <span>⚡ Live Server Vitals</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {vitals?.timestamp ? `Updated: ${new Date(vitals.timestamp).toLocaleTimeString()}` : 'Streaming over WebSockets...'}
        </span>
      </div>
      <div className="grid-vitals">
        <Meter label="CPU Utilization" value={vitals?.cpuUsagePercent || 34.2} colorClass="bar-blue" />
        <Meter label="Memory Usage" value={vitals?.memoryUsagePercent || 68.5} colorClass="bar-amber" />
        <Meter label="Disk Space" value={vitals?.diskUsagePercent || 24.8} colorClass="bar-emerald" />
      </div>
    </section>
  );
}
