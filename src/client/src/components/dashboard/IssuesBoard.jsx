import React from 'react';
import { Bug, AlertCircle, Clock, CheckCircle2, FileCode, Check } from 'lucide-react';
import AdminOnly from '../rbac/AdminOnly.jsx';

const columns = [
  { key: 'OPEN', label: 'OPEN', icon: AlertCircle, color: 'var(--status-rose)' },
  { key: 'IN_PROGRESS', label: 'IN PROGRESS', icon: Clock, color: 'var(--status-amber)' },
  { key: 'RESOLVED', label: 'RESOLVED', icon: CheckCircle2, color: 'var(--status-emerald)' },
];

export default function IssuesBoard({ incidents = [], onResolve, onDiff }) {
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <Bug size={16} style={{ color: 'var(--brand-blue)' }} />
          <span>Active Tracked System Incidents</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Total: {incidents.length} incidents
        </span>
      </div>

      <div className="issues-board-grid">
        {columns.map((col) => {
          const columnIncidents = incidents.filter(
            (i) => (i.status || 'OPEN').toUpperCase() === col.key
          );
          const IconComp = col.icon;

          return (
            <div className="column-box" key={col.key}>
              <div className="column-header">
                <IconComp size={14} style={{ color: col.color }} />
                <span>{col.label} ({columnIncidents.length})</span>
              </div>
              {columnIncidents.map((incident) => {
                const severity = String(incident.severity || 'MEDIUM').toLowerCase();
                const errorType = incident.errorType || incident.error_type || 'Error';
                const lastSeen = incident.lastSeenAt || incident.last_seen_at;

                return (
                  <div className="issue-card" key={incident.id}>
                    <div className="issue-header">
                      <span className={`pill ${severity}`}>
                        {incident.severity || 'MEDIUM'}
                      </span>
                    </div>

                    <div className="issue-title">
                      {incident.title || incident.normalized_message || incident.normalizedMessage}
                    </div>

                    <div className="issue-meta">
                      Type: <strong style={{ color: 'var(--text-primary)' }}>{errorType}</strong> • Last seen:{' '}
                      {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'Recently'}
                    </div>

                    <div className="issue-actions">
                      <button onClick={() => onDiff(incident)}>
                        <FileCode size={13} /> View Code Fix
                      </button>
                      <AdminOnly fallback={<span className="issue-meta">Admin to resolve</span>}>
                        {incident.status !== 'RESOLVED' && (
                          <button className="primary" onClick={() => onResolve(incident)}>
                            <Check size={13} /> Resolve
                          </button>
                        )}
                      </AdminOnly>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
