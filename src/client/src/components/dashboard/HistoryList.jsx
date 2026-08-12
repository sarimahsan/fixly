import React from 'react';
import { History, FileCode, CheckCircle2 } from 'lucide-react';

export default function HistoryList({ incidents = [], onDiff }) {
  const resolvedList = incidents.filter((i) => (i.status || '').toUpperCase() === 'RESOLVED');

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={16} style={{ color: 'var(--brand-blue)' }} />
          <span>Resolution History</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {resolvedList.length} incidents resolved
        </span>
      </div>

      <div className="history-table-container">
        {resolvedList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Resolved At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resolvedList.map((incident) => (
                <tr key={incident.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                    {incident.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{incident.title}</td>
                  <td>
                    <span className={`pill ${String(incident.severity || 'LOW').toLowerCase()}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--status-emerald)' }}>
                      <CheckCircle2 size={13} />{' '}
                      {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleTimeString() : 'Recently'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => onDiff(incident)}>
                      <FileCode size={13} /> View Patch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
            No resolved incidents logged yet.
          </div>
        )}
      </div>
    </section>
  );
}
