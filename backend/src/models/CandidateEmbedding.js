const pool = require('../config/database');

class CandidateEmbedding {
  /**
   * Upsert candidate embedding
   * @param {number} userId 
   * @param {number[]} embedding - 384-dimensional vector
   */
  static async upsert(userId, embedding) {
    const query = `
      INSERT INTO candidate_embeddings (user_id, embedding)
      VALUES ($1, $2::vector)
      ON CONFLICT (user_id) 
      DO UPDATE SET embedding = $2::vector
    `;
    await pool.query(query, [userId, JSON.stringify(embedding)]);
  }

  /**
   * Get candidate embedding
   * @param {number} userId 
   * @returns {Promise<number[]|null>}
   */
  static async findByUserId(userId) {
    const query = 'SELECT embedding FROM candidate_embeddings WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    if (!result.rows[0]?.embedding) return null;
    const raw = result.rows[0].embedding;
    // pgvector returns a string like "[0.1,0.2,...]"; parse it into a float array
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  /**
   * Delete candidate embedding
   * @param {number} userId 
   */
  static async delete(userId) {
    const query = 'DELETE FROM candidate_embeddings WHERE user_id = $1';
    await pool.query(query, [userId]);
  }

  /**
   * Check if embedding exists
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  static async exists(userId) {
    const query = 'SELECT 1 FROM candidate_embeddings WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Get all candidate IDs with embeddings (for filtering)
   * @param {object} filters - Optional filters (location, languages, etc.)
   * @returns {Promise<number[]>}
   */
  static async getCandidateIds(filters = {}) {
    let query = `
      SELECT DISTINCT ce.user_id
      FROM candidate_embeddings ce
      JOIN users u ON ce.user_id = u.id
      JOIN professional_profiles pp ON u.id = pp.user_id
      WHERE u.user_type = 'professional'
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.location) {
      conditions.push(`pp.location = $${paramCount}`);
      values.push(filters.location);
      paramCount++;
    }

    if (filters.languages && filters.languages.length > 0) {
      conditions.push(`pp.languages_spoken && $${paramCount}::text[]`);
      values.push(filters.languages);
      paramCount++;
    }

    if (filters.yearsOfExperience) {
      // Calculate years of experience from work_experience table
      query += `
        AND EXISTS (
          SELECT 1 FROM work_experience we
          WHERE we.user_id = ce.user_id
          GROUP BY we.user_id
          HAVING SUM(
            EXTRACT(YEAR FROM COALESCE(we.end_date, CURRENT_DATE)) - 
            EXTRACT(YEAR FROM we.start_date)
          ) >= $${paramCount}
        )
      `;
      values.push(filters.yearsOfExperience);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => row.user_id);
  }
}

module.exports = CandidateEmbedding;
