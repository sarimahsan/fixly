export const sampleIncidents = [];

export function upsertIncident(list = [], patch = {}) {
  if (!patch || typeof patch !== 'object') return list;
  const id = patch.id || patch.incidentId;
  if (!id) return list;

  const existing = list.find((item) => item && String(item.id || item.incidentId) === String(id));

  if (!existing) {
    // Ignore partial WebSocket payloads (e.g. diagnosis/fix events) if no full incident exists yet
    if (!patch.title && !patch.status && !patch.errorType && !patch.error_type) {
      return list;
    }
    return [
      {
        id,
        title: patch.title || patch.normalizedMessage || patch.rawLogLine || 'System Incident',
        status: patch.status || 'OPEN',
        severity: patch.severity || 'MEDIUM',
        occurrenceCount: patch.occurrence_count || patch.occurrenceCount || 1,
        ...patch,
      },
      ...list,
    ];
  }

  // Preserve existing title, status, severity when partial payload updates arrive
  return list.map((item) => {
    if (item && String(item.id || item.incidentId) === String(id)) {
      return {
        ...item,
        ...patch,
        id,
        title: patch.title || item.title,
        status: patch.status || item.status || 'OPEN',
        severity: patch.severity || item.severity || 'MEDIUM',
        occurrenceCount: patch.occurrence_count || patch.occurrenceCount || item.occurrenceCount || 1,
      };
    }
    return item;
  });
}
