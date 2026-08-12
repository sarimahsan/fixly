import { getPool } from '../common/db.js';

export const IncidentOccurrenceModel = {
  async getByIncidentId(incidentId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM incident_occurrences WHERE incident_id = ? ORDER BY timestamp DESC LIMIT 100',
      [incidentId]
    );
    return rows.map(r => ({
      ...r,
      server_vitals_snapshot: typeof r.server_vitals_snapshot === 'string' ? JSON.parse(r.server_vitals_snapshot) : r.server_vitals_snapshot,
    }));
  },

  async create({ incidentId, serverId = null, rawLogLine, serverVitalsSnapshot = null }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO incident_occurrences (incident_id, server_id, raw_log_line, server_vitals_snapshot) VALUES (?, ?, ?, ?)',
      [incidentId, serverId, rawLogLine, serverVitalsSnapshot ? JSON.stringify(serverVitalsSnapshot) : null]
    );
    return result.insertId;
  }
};

export default IncidentOccurrenceModel;
