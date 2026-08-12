export const sampleIncidents = [
  { id: 'inc-demo-1', title: 'UnhandledPromiseRejectionError: Connection Timeout', severity: 'HIGH', status: 'OPEN', occurrenceCount: 3, lastSeenAt: new Date().toISOString(), rootCause: 'Database connection pool exhausted.', diffPatch: '--- a/app.js\n+++ b/app.js\n@@ -1,2 +1,2 @@\n-db.connect()\n+await db.connectWithTimeout(5000)' },
  { id: 'inc-demo-2', title: 'Disk usage threshold exceeded', severity: 'MEDIUM', status: 'IN_PROGRESS', occurrenceCount: 8, lastSeenAt: new Date().toISOString() }
];

export function upsertIncident(list, patch) {
  const id = patch.id || patch.incidentId;
  const existing = list.find((item) => item.id === id);
  if (!existing) return [{ ...patch, id, status: patch.status || 'OPEN' }, ...list];
  return list.map((item) => item.id === id ? { ...item, ...patch, id } : item);
}
