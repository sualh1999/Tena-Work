const pool = require('../config/database');

class Application {
  static async create({ jobId, candidateId, coverLetter }) {
    const query = `
      INSERT INTO applications (job_id, candidate_id, cover_letter, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `;
    const values = [jobId, candidateId, coverLetter];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM applications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByCandidateId(candidateId, status = null, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    let countQuery = 'SELECT COUNT(*) FROM applications WHERE candidate_id = $1';
    let query = `
      SELECT 
        a.*,
        j.title as job_title,
        j.location as job_location,
        ep.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON j.employer_id = u.id
      JOIN employer_profiles ep ON u.id = ep.user_id
      WHERE a.candidate_id = $1
    `;
    const values = [candidateId];

    if (status) {
      countQuery += ' AND status = $2';
      query += ' AND a.status = $2';
      values.push(status);
    }

    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    query += ' ORDER BY a.applied_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(pageSize, offset);

    const result = await pool.query(query, values);

    return {
      items: result.rows,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  static async findByJobId(jobId, status = null, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    let countQuery = 'SELECT COUNT(*) FROM applications WHERE job_id = $1';
    let query = `
      SELECT 
        a.*,
        u.id as candidate_user_id,
        u.full_name as candidate_name,
        pp.bio as candidate_bio,
        pp.location as candidate_location,
        pp.resume_url as candidate_resume
      FROM applications a
      JOIN users u ON a.candidate_id = u.id
      LEFT JOIN professional_profiles pp ON u.id = pp.user_id
      WHERE a.job_id = $1
    `;
    const values = [jobId];

    if (status) {
      countQuery += ' AND status = $2';
      query += ' AND a.status = $2';
      values.push(status);
    }

    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    query += ' ORDER BY a.applied_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(pageSize, offset);

    const result = await pool.query(query, values);

    return {
      items: result.rows,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE applications 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async markAsViewed(jobId) {
    const query = `
      UPDATE applications 
      SET status = 'viewed', updated_at = NOW()
      WHERE job_id = $1 AND status = 'pending'
      RETURNING id
    `;
    const result = await pool.query(query, [jobId]);
    return result.rows;
  }

  static async exists(jobId, candidateId) {
    const query = 'SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2';
    const result = await pool.query(query, [jobId, candidateId]);
    return result.rows.length > 0;
  }

  static async countAll() {
    const query = 'SELECT COUNT(*) FROM applications';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Application;
