import { getPool } from '../common/db.js';

export const ServerVitalsModel = {
  async getLatest(serverId = null) {
    const pool = getPool();
    let query = 'SELECT * FROM server_vitals';
    const params = [];
    if (serverId) {
      query += ' WHERE server_id = ?';
      params.push(serverId);
    }
    query += ' ORDER BY timestamp DESC LIMIT 1';
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  async record({ serverId = 1, cpuUsagePercent, memoryUsagePercent, diskUsagePercent }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO server_vitals (server_id, cpu_usage_percent, memory_usage_percent, disk_usage_percent) VALUES (?, ?, ?, ?)',
      [serverId, cpuUsagePercent, memoryUsagePercent, diskUsagePercent]
    );
    return result.insertId;
  }
};

export default ServerVitalsModel;
