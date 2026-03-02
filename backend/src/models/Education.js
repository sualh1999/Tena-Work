const pool = require('../config/database');

class Education {
  static async create({ userId, institutionName, degree, fieldOfStudy, year }) {
    const query = `
      INSERT INTO education (user_id, institution_name, degree, field_of_study, year)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, institutionName, degree, fieldOfStudy, year];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async bulkCreate(userId, educationArray) {
    if (!educationArray || educationArray.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const edu of educationArray) {
        const query = `
          INSERT INTO education (user_id, institution_name, degree, field_of_study, year)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const values = [
          userId,
          edu.institution_name,
          edu.degree,
          edu.field_of_study || null,
          edu.year || null
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
      SELECT * FROM education 
      WHERE user_id = $1 
      ORDER BY year DESC, id DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async deleteByUserId(userId) {
    const query = 'DELETE FROM education WHERE user_id = $1';
    await pool.query(query, [userId]);
  }

  static async replaceAll(userId, educationArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing
      await client.query('DELETE FROM education WHERE user_id = $1', [userId]);
      
      // Insert new
      const results = [];
      if (educationArray && educationArray.length > 0) {
        for (const edu of educationArray) {
          const query = `
            INSERT INTO education (user_id, institution_name, degree, field_of_study, year)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          const values = [
            userId,
            edu.institution_name,
            edu.degree,
            edu.field_of_study || null,
            edu.year || null
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

module.exports = Education;
