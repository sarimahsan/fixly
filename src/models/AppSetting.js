import { getPool } from '../common/db.js';

export const AppSettingModel = {
  async getAll() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT setting_key, masked_value, updated_at FROM app_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = r.masked_value;
    });
    return settings;
  },

  async getByKey(key) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
    return rows[0] || null;
  },

  async upsert(key, valueEncrypted, maskedValue) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO app_settings (setting_key, value_encrypted, masked_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value_encrypted = VALUES(value_encrypted), masked_value = VALUES(masked_value), updated_at = NOW()`,
      [key, valueEncrypted, maskedValue]
    );
    return this.getByKey(key);
  }
};

export default AppSettingModel;
