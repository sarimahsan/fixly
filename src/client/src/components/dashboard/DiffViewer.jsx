function lineClass(line) {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'del';
  if (line.startsWith('@@')) return 'hunk';
  return '';
}

export default function DiffViewer({ incident, onClose }) {
  if (!incident) return null;
  const patch = incident.diffPatch || incident.proposals?.[0]?.diffPatch || 'No diff patch available for this incident.';
  return <div className="modal"><div className="modal-card wide"><button className="close" onClick={onClose}>×</button><h2>Code diff</h2><p className="muted">{incident.title}</p><pre className="diff">{patch.split('\n').map((line, index) => <div key={index} className={lineClass(line)}>{line || ' '}</div>)}</pre></div></div>;
}
