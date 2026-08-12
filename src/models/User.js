import { getPool } from '../common/db.js';

export const UserModel = {
  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, email, full_name, role, api_token, created_at, updated_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ email, passwordHash, fullName, role = 'OPERATOR', apiToken = null }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role, api_token) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, fullName, role, apiToken]
    );
    return this.findById(result.insertId);
  },

  async update(id, { fullName, email, apiToken }) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), api_token = COALESCE(?, api_token) WHERE id = ?',
      [fullName, email, apiToken, id]
    );
    return this.findById(id);
  }
};

export default UserModel;
