import React, { useState } from 'react';

export default function ResolveModal({ incident, onClose, onResolve }) {
  const [notes, setNotes] = useState('Manually verified and resolved.');
  if (!incident) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ width: '480px' }}>
        <div className="modal-header">
          <h3>Resolve Incident Manually</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '18px' }}>
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onResolve(incident, notes);
          }}
          className="modal-body"
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {incident.title || incident.normalizedMessage}
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Resolution Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe manual resolution steps..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary"
              type="submit"
              style={{ backgroundColor: 'var(--status-emerald)', borderColor: 'var(--status-emerald)' }}
            >
              ✓ Confirm Resolution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
