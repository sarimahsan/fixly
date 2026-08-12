import crypto from 'node:crypto';
import { getPool } from '../common/db.js';

export const IncidentModel = {
  async getAll({ status, severity } = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY last_seen_at DESC';
    const [rows] = await pool.query(query, params);

    return rows.map(r => ({
      ...r,
      ai_diagnosis: typeof r.ai_diagnosis === 'string' ? JSON.parse(r.ai_diagnosis) : r.ai_diagnosis,
      code_fix_proposal: typeof r.code_fix_proposal === 'string' ? JSON.parse(r.code_fix_proposal) : r.code_fix_proposal,
    }));
  },

  async getById(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...r,
      ai_diagnosis: typeof r.ai_diagnosis === 'string' ? JSON.parse(r.ai_diagnosis) : r.ai_diagnosis,
      code_fix_proposal: typeof r.code_fix_proposal === 'string' ? JSON.parse(r.code_fix_proposal) : r.code_fix_proposal,
    };
  },

  async getByFingerprint(fingerprint) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM incidents WHERE fingerprint = ?', [fingerprint]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...r,
      ai_diagnosis: typeof r.ai_diagnosis === 'string' ? JSON.parse(r.ai_diagnosis) : r.ai_diagnosis,
      code_fix_proposal: typeof r.code_fix_proposal === 'string' ? JSON.parse(r.code_fix_proposal) : r.code_fix_proposal,
    };
  },

  async create({ id, fingerprint, title, errorType, normalizedMessage, rawStackTrace, severity = 'MEDIUM', targetFile = null, aiDiagnosis = null, codeFixProposal = null }) {
    const pool = getPool();
    const incId = id || `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fp = fingerprint || crypto.createHash('md5').update(`${normalizedMessage || title}:${Date.now()}:${Math.random()}`).digest('hex');

    await pool.query(
      `INSERT INTO incidents (id, fingerprint, title, error_type, normalized_message, raw_stack_trace, severity, target_file, status, occurrence_count, ai_diagnosis, code_fix_proposal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 1, ?, ?)`,
      [
        incId,
        fp,
        title,
        errorType || 'Error',
        normalizedMessage || title,
        rawStackTrace || null,
        severity,
        targetFile,
        aiDiagnosis ? JSON.stringify(aiDiagnosis) : null,
        codeFixProposal ? JSON.stringify(codeFixProposal) : null
      ]
    );
    return this.getById(incId);
  },

  async incrementOccurrence(id) {
    const pool = getPool();
    await pool.query(
      'UPDATE incidents SET occurrence_count = occurrence_count + 1, last_seen_at = NOW() WHERE id = ?',
      [id]
    );
    return this.getById(id);
  },

  async updateDiagnosis(id, diagnosisObj) {
    const pool = getPool();
    await pool.query(
      'UPDATE incidents SET ai_diagnosis = ? WHERE id = ?',
      [JSON.stringify(diagnosisObj), id]
    );
    return this.getById(id);
  },

  async updateProposal(id, proposalObj) {
    const pool = getPool();
    await pool.query(
      'UPDATE incidents SET code_fix_proposal = ?, status = "IN_PROGRESS" WHERE id = ?',
      [JSON.stringify(proposalObj), id]
    );
    return this.getById(id);
  },

  async resolve(id, { resolvedByType = 'HUMAN', resolvedByUserId = null, resolutionNotes = '' }) {
    const pool = getPool();
    await pool.query(
      'UPDATE incidents SET status = "RESOLVED", resolved_at = NOW(), resolved_by_type = ?, resolution_notes = ? WHERE id = ?',
      [resolvedByType, resolutionNotes, id]
    );
    return this.getById(id);
  }
};

export default IncidentModel;
