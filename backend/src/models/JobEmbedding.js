const pool = require('../config/database');

class JobEmbedding {
  /**
   * Upsert job embedding
   * @param {number} jobId 
   * @param {number[]} embedding - 384-dimensional vector
   */
  static async upsert(jobId, embedding) {
    const query = `
      INSERT INTO job_embeddings (job_id, embedding)
      VALUES ($1, $2::vector)
      ON CONFLICT (job_id) 
      DO UPDATE SET embedding = $2::vector
    `;
    await pool.query(query, [jobId, JSON.stringify(embedding)]);
  }

  /**
   * Get job embedding
   * @param {number} jobId 
   * @returns {Promise<number[]|null>}
   */
  static async findByJobId(jobId) {
    const query = 'SELECT embedding FROM job_embeddings WHERE job_id = $1';
    const result = await pool.query(query, [jobId]);
    if (!result.rows[0]?.embedding) return null;
    const raw = result.rows[0].embedding;
    // pgvector returns a string like "[0.1,0.2,...]"; parse it into a float array
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  /**
   * Delete job embedding
   * @param {number} jobId 
   */
  static async delete(jobId) {
    const query = 'DELETE FROM job_embeddings WHERE job_id = $1';
    await pool.query(query, [jobId]);
  }

  /**
   * Check if embedding exists
   * @param {number} jobId 
   * @returns {Promise<boolean>}
   */
  static async exists(jobId) {
    const query = 'SELECT 1 FROM job_embeddings WHERE job_id = $1';
    const result = await pool.query(query, [jobId]);
    return result.rows.length > 0;
  }
}

module.exports = JobEmbedding;
