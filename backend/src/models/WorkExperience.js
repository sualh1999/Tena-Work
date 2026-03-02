const pool = require('../config/database');

class WorkExperience {
  static async create({ userId, companyName, title, startDate, endDate, description }) {
    const query = `
      INSERT INTO work_experience (user_id, company_name, title, start_date, end_date, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [userId, companyName, title, startDate, endDate, description];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async bulkCreate(userId, experienceArray) {
    if (!experienceArray || experienceArray.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const exp of experienceArray) {
        const query = `
          INSERT INTO work_experience (user_id, company_name, title, start_date, end_date, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const values = [
          userId,
          exp.company_name,
          exp.title,
          exp.start_date,
          exp.end_date || null,
          exp.description || null
        ];
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT * FROM work_experience 
      WHERE user_id = $1 
      ORDER BY start_date DESC, id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async deleteByUserId(userId) {
    const query = 'DELETE FROM work_experience WHERE user_id = $1';
    await pool.query(query, [userId]);
  }

  static async replaceAll(userId, experienceArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing
      await client.query('DELETE FROM work_experience WHERE user_id = $1', [userId]);
      
      // Insert new
      const results = [];
      if (experienceArray && experienceArray.length > 0) {
        for (const exp of experienceArray) {
          const query = `
            INSERT INTO work_experience (user_id, company_name, title, start_date, end_date, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const values = [
            userId,
            exp.company_name,
            exp.title,
            exp.start_date,
            exp.end_date || null,
            exp.description || null
          ];
          const result = await client.query(query, values);
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = WorkExperience;
