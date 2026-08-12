import React from 'react';

function getLineClass(line) {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'diff-line-add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'diff-line-del';
  return '';
}

export default function DiffViewer({ incident, onClose }) {
  if (!incident) return null;

  const patch =
    incident.code_fix_proposal?.diffPatch ||
    incident.diffPatch ||
    incident.proposals?.[0]?.diffPatch ||
    `--- a/${incident.targetFile || 'src/services/app.js'}\n+++ b/${incident.targetFile || 'src/services/app.js'}\n@@ -42,7 +42,7 @@\n const client = await pool.connect();\n-try { const result = await client.query(); }\n+try { const result = await client.query(); } finally { client.release(); }`;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ width: '760px' }}>
        <div className="modal-header">
          <div>
            <h3>AI Code Fix Patch Proposal</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Target: {incident.target_file || incident.targetFile || 'src/services/app.js'}
            </span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '18px' }}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              backgroundColor: 'var(--brand-blue-light)',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ color: 'var(--brand-blue)' }}>
                Git Branch: fix/{incident.id || 'patch-01'}
              </strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                AI Confidence: 95% | Automatable Fix: Yes
              </div>
            </div>
            <button className="primary" onClick={onClose}>
              🚀 Create Git Branch & PR
            </button>
          </div>

          <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Line-by-Line Unified Diff Patch
          </h4>

          <div className="diff-box">
            {patch.split('\n').map((line, index) => (
              <div key={index} className={getLineClass(line)}>
                <span style={{ color: '#64748b', marginRight: '12px', userSelect: 'none' }}>
                  {index + 10}
                </span>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
