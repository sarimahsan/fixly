import { useState } from 'react';

export default function ResolveModal({ incident, onClose, onResolve }) {
  const [notes, setNotes] = useState('Manually verified and resolved.');
  if (!incident) return null;
  return <div className="modal"><form className="modal-card" onSubmit={(event) => { event.preventDefault(); onResolve(incident, notes); }}><button type="button" className="close" onClick={onClose}>×</button><h2>Resolve incident</h2><p>{incident.title}</p><label>Resolution notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button className="primary" type="submit">Resolve incident</button></form></div>;
}
