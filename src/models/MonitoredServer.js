import { getPool } from '../common/db.js';

export const MonitoredServerModel = {
  async getAll() {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM monitored_servers ORDER BY id DESC');
    return rows;
  },

  async getById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM monitored_servers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, host, port = 22, sshUser = 'ubuntu', sshKeyPath = null, logFilePath = '/var/log/app.log' }) {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO monitored_servers (name, host, port, ssh_user, ssh_key_path, log_file_path, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, host, port, sshUser, sshKeyPath, logFilePath, 'CONNECTED']
    );
    return this.getById(result.insertId);
  },

  async updateStatus(id, status) {
    const pool = getPool();
    await pool.query('UPDATE monitored_servers SET status = ?, last_ping_at = NOW() WHERE id = ?', [status, id]);
    return this.getById(id);
  }
};

export default MonitoredServerModel;
