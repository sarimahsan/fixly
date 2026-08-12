import { getPool } from '../common/db.js';

export const UserModel = {
  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, email, full_name, role, api_token, two_factor_secret as twoFactorSecret, two_factor_enabled as twoFactorEnabled, created_at, updated_at FROM users WHERE id = ?', [id]);
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

  async update(id, { fullName, email, apiToken, twoFactorSecret, twoFactorEnabled }) {
    const pool = getPool();
    const updateFields = [];
    const updateValues = [];
    if (fullName !== undefined) { updateFields.push('full_name = ?'); updateValues.push(fullName); }
    if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
    if (apiToken !== undefined) { updateFields.push('api_token = ?'); updateValues.push(apiToken); }
    if (twoFactorSecret !== undefined) { updateFields.push('two_factor_secret = ?'); updateValues.push(twoFactorSecret); }
    if (twoFactorEnabled !== undefined) { updateFields.push('two_factor_enabled = ?'); updateValues.push(twoFactorEnabled ? 1 : 0); }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    return this.findById(id);
  }
};

export default UserModel;
