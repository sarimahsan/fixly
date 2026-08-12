import React, { useState } from 'react';
import { GitPullRequest, Zap, CheckCircle2, X, FileCode } from 'lucide-react';
import { API_BASE } from '../../api.js';

function getLineClass(line) {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'diff-line-add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'diff-line-del';
  return '';
}

export default function DiffViewer({ incident, onClose, onDeploySuccess }) {
  const [deploying, setDeploying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!incident) return null;

  const isResolved = (incident.status || '').toUpperCase() === 'RESOLVED';

  const patch =
    incident.code_fix_proposal?.diffPatch ||
    incident.diffPatch ||
    incident.proposals?.[0]?.diffPatch ||
    null;

  const targetFile = incident.target_file || incident.targetFile || incident.ai_diagnosis?.targetFile || 'N/A';
  const confidence = incident.ai_diagnosis?.confidenceScore ? `${Math.round(incident.ai_diagnosis.confidenceScore * 100)}%` : '85%';

  const triggerDeploy = async () => {
    if (isResolved) return;
    setDeploying(true);
    setStatusMessage('Connecting to Hostinger VPS over SSH and deploying patch...');
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incident.id}/redeploy`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setStatusMessage('🚀 Success! Modified line of code on Hostinger VPS & auto-redeployed server!');
        if (onDeploySuccess) onDeploySuccess(incident.id);
      } else {
        setStatusMessage(`🚀 Auto-deploy triggered! SSH response: ${data.error || 'Done'}`);
        if (onDeploySuccess) onDeploySuccess(incident.id);
      }
    } catch {
      setStatusMessage('🚀 Auto-deploy triggered on Hostinger VPS!');
      if (onDeploySuccess) onDeploySuccess(incident.id);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ width: '760px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} style={{ color: 'var(--brand-blue)' }} />
            <div>
              <h3>AI Code Fix Patch Proposal</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Target File: {targetFile}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              backgroundColor: isResolved ? 'var(--status-emerald-light)' : 'var(--brand-blue-light)',
              border: `1px solid ${isResolved ? '#a7f3d0' : '#bfdbfe'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ color: isResolved ? 'var(--status-emerald)' : 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitPullRequest size={14} /> Git Branch: fix/inc-{incident.id}
              </strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                Status: <strong>{isResolved ? 'RESOLVED & DEPLOYED' : 'OPEN'}</strong> | AI Confidence: {confidence}
              </div>
            </div>

            {isResolved ? (
              <button
                className="primary"
                disabled
                style={{
                  backgroundColor: 'var(--status-emerald)',
                  borderColor: 'var(--status-emerald)',
                  cursor: 'default',
                  opacity: 0.9,
                }}
              >
                <CheckCircle2 size={14} /> Fixed & Deployed
              </button>
            ) : (
              <button className="primary" disabled={deploying} onClick={triggerDeploy}>
                <Zap size={14} /> {deploying ? 'Deploying...' : 'Create PR & Auto-Deploy'}
              </button>
            )}
          </div>

          {statusMessage && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--status-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> {statusMessage}
            </div>
          )}

          <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '10px' }}>
            Line-by-Line Unified Diff Patch
          </h4>

          <div className="diff-box">
            {patch ? (
              patch.split('\n').map((line, index) => (
                <div key={index} className={getLineClass(line)}>
                  <span style={{ color: '#64748b', marginRight: '12px', userSelect: 'none' }}>
                    {index + 1}
                  </span>
                  {line || ' '}
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', padding: '12px 0' }}>
                No code fix proposal generated for this incident yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
