import React from 'react';
import AdminOnly from '../rbac/AdminOnly.jsx';

const columns = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export default function IssuesBoard({ incidents = [], onResolve, onDiff }) {
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <span>🐛 Active Tracked System Incidents</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Total: {incidents.length} incidents
        </span>
      </div>

      <div className="issues-board-grid">
        {columns.map((status) => (
          <div className="column-box" key={status}>
            <div className="column-header">
              {status.replace('_', ' ')} (
              {incidents.filter((i) => i.status === status).length})
            </div>
            {incidents
              .filter((i) => i.status === status)
              .map((incident) => (
                <div className="issue-card" key={incident.id}>
                  <div className="issue-header">
                    <span className={`pill ${String(incident.severity || 'LOW').toLowerCase()}`}>
                      {incident.severity || 'LOW'}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {incident.occurrenceCount || 1} hits
                    </span>
                  </div>

                  <div className="issue-title">
                    {incident.title || incident.normalizedMessage}
                  </div>

                  <div className="issue-meta">
                    Type: <strong style={{ color: 'var(--text-primary)' }}>{incident.errorType || 'Error'}</strong> • Last seen:{' '}
                    {incident.lastSeenAt ? new Date(incident.lastSeenAt).toLocaleTimeString() : 'Recently'}
                  </div>

                  <div className="issue-actions">
                    <button onClick={() => onDiff(incident)}>
                      📄 View Code Fix
                    </button>
                    <AdminOnly fallback={<span className="issue-meta">Admin to resolve</span>}>
                      {incident.status !== 'RESOLVED' && (
                        <button className="primary" onClick={() => onResolve(incident)}>
                          ✓ Resolve
                        </button>
                      )}
                    </AdminOnly>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
