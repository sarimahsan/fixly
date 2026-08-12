import React from 'react';
import { Terminal, Activity, AlertTriangle } from 'lucide-react';

export default function LiveFeed({ events = [], connected = false }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Terminal size={16} style={{ color: 'var(--brand-blue)' }} />
          <span>Remote App Log Stream (/root/target-app/logs/app.log)</span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: connected ? 'var(--status-emerald-light)' : '#f1f5f9',
            color: connected ? 'var(--status-emerald)' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Activity size={12} /> {connected ? 'SSH Stream Live' : 'Connecting...'}
        </span>
      </div>

      <div className="live-feed-box">
        {events.length > 0 ? (
          events.map((item) => {
            const timeStr = item.payload?.timestamp
              ? new Date(item.payload.timestamp).toLocaleTimeString()
              : new Date().toLocaleTimeString();

            const isError = item.event === 'log:error' || item.payload?.severity === 'HIGH' || item.payload?.severity === 'CRITICAL';
            const isWarn = item.payload?.severity === 'MEDIUM';
            const textContent = item.payload?.rawLogLine || item.payload?.title || item.event;

            return (
              <div
                className={`log-line ${isError ? 'error' : isWarn ? 'warn' : ''}`}
                key={item.key || Math.random()}
              >
                <span className="log-time">{timeStr}</span>
                <span style={{ fontWeight: 600 }}>{textContent}</span>
              </div>
            );
          })
        ) : (
          <div style={{ color: '#64748b', fontSize: '12px', padding: '12px 0' }}>
            Listening for log stream events from Hostinger VPS...
          </div>
        )}
      </div>
    </div>
  );
}
