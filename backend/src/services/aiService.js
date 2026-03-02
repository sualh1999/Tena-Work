const axios = require('axios');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY || 'dev-secret';
const TIMEOUT_MS = 5000;

class AIService {
  constructor() {
    this.client = axios.create({
      baseURL: AI_ENGINE_URL,
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY
      }
    });
  }

  /**
   * Generate embedding vector from text
   * @param {string} text - Text to convert to embedding
   * @returns {Promise<number[]>} - 384-dimensional vector
   */
  async generateEmbedding(text) {
    try {
      const response = await this.client.post('/generate-embedding', { text });
      return response.data.vector;
    } catch (error) {
      console.error('AI Engine - Generate Embedding Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Get recommended jobs for a candidate
   * @param {number[]} profileVector - Candidate's profile vector
   * @param {number} limit - Number of recommendations (default 5)
   * @returns {Promise<Array<{id: number, score: number}>>}
   */
  async recommendJobs(profileVector, limit = 5) {
    try {
      const response = await this.client.post('/recommend-jobs', {
        profile_vector: profileVector,
        limit
      });
      return response.data.recommendations;
    } catch (error) {
      console.error('AI Engine - Recommend Jobs Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      // Return empty array instead of throwing to gracefully handle AI service downtime
      return [];
    }
  }

  /**
   * Get recommended candidates for a job
   * @param {number[]} jobVector - Job's vector
   * @param {number[]} candidateIds - Array of candidate IDs to consider
   * @param {number} limit - Number of recommendations (default 10)
   * @returns {Promise<Array<{id: number, score: number}>>}
   */
  async recommendCandidates(jobVector, candidateIds, limit = 10) {
    try {
      if (!candidateIds || candidateIds.length === 0) {
        return [];
      }

      const response = await this.client.post('/recommend-candidates', {
        job_vector: jobVector,
        candidate_ids: candidateIds,
        limit
      });
      return response.data.recommendations;
    } catch (error) {
      console.error('AI Engine - Recommend Candidates Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Check if AI Engine is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      await this.client.get('/health', { timeout: 2000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;
