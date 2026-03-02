const pool = require('../config/database');

class Job {
  static async create({
    employerId,
    title,
    description,
    location,
    salaryRange,
    employmentType,
    yearsOfExperienceRequired,
    requiredLanguages
  }) {
    const query = `
      INSERT INTO jobs 
      (employer_id, title, description, location, salary_range, employment_type, 
       years_of_experience_required, required_languages, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `;
    const values = [
      employerId,
      title,
      description,
      location,
      salaryRange,
      employmentType,
      yearsOfExperienceRequired,
      requiredLanguages
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        j.*,
        ep.company_name,
        ep.logo_url,
        u.id as employer_user_id
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      JOIN employer_profiles ep ON u.id = ep.user_id
      WHERE j.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmployerId(employerId, status = null, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    let countQuery = 'SELECT COUNT(*) FROM jobs WHERE employer_id = $1';
    let query = 'SELECT * FROM jobs WHERE employer_id = $1';
    const values = [employerId];

    if (status) {
      countQuery += ' AND status = $2';
      query += ' AND status = $2';
      values.push(status);
    }

    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
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
      UPDATE jobs 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM jobs WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async countByStatus(status) {
    const query = 'SELECT COUNT(*) FROM jobs WHERE status = $1';
    const result = await pool.query(query, [status]);
    return parseInt(result.rows[0].count);
  }

  static async countAll() {
    const query = 'SELECT COUNT(*) FROM jobs';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  static async getActiveJobs(limit = 100) {
    const query = `
      SELECT id, title, description, location, required_languages, years_of_experience_required
      FROM jobs 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    
    const query = `
      SELECT 
        j.*,
        ep.company_name,
        ep.logo_url
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      JOIN employer_profiles ep ON u.id = ep.user_id
      WHERE j.id = ANY($1) AND j.status = 'active'
    `;
    const result = await pool.query(query, [ids]);
    return result.rows;
  }
}

module.exports = Job;
