import { getPool } from '../common/db.js';

export const AuditLogModel = {
  async getAll(limit = 100) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT a.*, u.email as user_email, u.full_name as user_full_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(r => ({
      ...r,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
    }));
  },

  async log({ userId = null, action, details = null }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details ? JSON.stringify(details) : null]
    );
    return result.insertId;
  }
};

export default AuditLogModel;
