import React from 'react';

export default function HistoryList({ incidents = [], onDiff }) {
  const resolved = incidents.filter((incident) => incident.status === 'RESOLVED');
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <span>📜 Verified Resolution Audit Trail</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--status-emerald)' }}>
          ✓ {resolved.length} Auto/Manually Resolved
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {resolved.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            No resolved incidents recorded yet.
          </p>
        ) : (
          resolved.map((incident) => (
            <div
              key={incident.id}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-card)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifySpace: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {incident.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Resolved at:{' '}
                  {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Recently'} • By:{' '}
                  <strong style={{ color: 'var(--text-secondary)' }}>{incident.resolvedByType || 'HUMAN'}</strong>
                </div>
                {incident.resolutionNotes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                    "{incident.resolutionNotes}"
                  </div>
                )}
              </div>
              <button onClick={() => onDiff(incident)}>
                📄 Audit Diff
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
