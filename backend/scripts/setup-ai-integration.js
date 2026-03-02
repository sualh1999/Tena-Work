#!/usr/bin/env node

/**
 * Setup script for AI Integration
 * This script helps set up the AI integration by:
 * 1. Running the embedding tables migration
 * 2. Checking AI Engine connectivity
 * 3. Verifying pgvector extension
 */

const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

async function checkPgVector() {
  console.log('\n📦 Checking pgvector extension...');
  try {
    const result = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ pgvector extension is installed');
      return true;
    } else {
      console.log('❌ pgvector extension is NOT installed');
      console.log('   Please install pgvector: https://github.com/pgvector/pgvector');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking pgvector:', error.message);
    return false;
  }
}

async function checkEmbeddingTables() {
  console.log('\n📋 Checking embedding tables...');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('job_embeddings', 'candidate_embeddings')
    `);
    
    const tables = result.rows.map(r => r.table_name);
    
    if (tables.includes('job_embeddings') && tables.includes('candidate_embeddings')) {
      console.log('✅ Embedding tables exist');
      
      // Check counts
      const jobCount = await pool.query('SELECT COUNT(*) FROM job_embeddings');
      const candidateCount = await pool.query('SELECT COUNT(*) FROM candidate_embeddings');
      
      console.log(`   - job_embeddings: ${jobCount.rows[0].count} records`);
      console.log(`   - candidate_embeddings: ${candidateCount.rows[0].count} records`);
      
      return true;
    } else {
      console.log('❌ Embedding tables do NOT exist');
      console.log('   Run: npm run migrate:up');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return false;
  }
}

async function checkAIEngine() {
  console.log('\n🤖 Checking AI Engine connectivity...');
  console.log(`   URL: ${AI_ENGINE_URL}`);
  
  try {
    const response = await axios.get(`${AI_ENGINE_URL}/health`, { timeout: 3000 });
    console.log('✅ AI Engine is running');
    console.log(`   Status: ${response.status}`);
    return true;
  } catch (error) {
    console.log('❌ AI Engine is NOT accessible');
    if (error.code === 'ECONNREFUSED') {
      console.log('   Connection refused - is the AI Engine running?');
      console.log('   Start it with: cd ai-engine && python -m uvicorn app.main:app --port 8000');
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testEmbeddingGeneration() {
  console.log('\n🧪 Testing embedding generation...');
  
  try {
    const response = await axios.post(
      `${AI_ENGINE_URL}/generate-embedding`,
      { text: 'Test healthcare professional with nursing experience' },
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': process.env.AI_INTERNAL_KEY || 'dev-secret-key-change-in-production'
        }
      }
    );
    
    if (response.data.vector && Array.isArray(response.data.vector)) {
      console.log('✅ Embedding generation works');
      console.log(`   Vector dimension: ${response.data.vector.length}`);
      return true;
    } else {
      console.log('❌ Unexpected response format');
      return false;
    }
  } catch (error) {
    console.log('❌ Embedding generation failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 TenaWork AI Integration Setup Check\n');
  console.log('='.repeat(50));
  
  const results = {
    pgvector: false,
    tables: false,
    aiEngine: false,
    embedding: false
  };
  
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Run checks
    results.pgvector = await checkPgVector();
    results.tables = await checkEmbeddingTables();
    results.aiEngine = await checkAIEngine();
    
    if (results.aiEngine) {
      results.embedding = await testEmbeddingGeneration();
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary\n');
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      console.log('🎉 All checks passed! AI integration is ready.');
      console.log('\nYou can now:');
      console.log('  1. Start the backend: npm run dev');
      console.log('  2. Register professionals and create jobs');
      console.log('  3. Get AI-powered recommendations');
    } else {
      console.log('⚠️  Some checks failed. Please fix the issues above.\n');
      
      if (!results.pgvector) {
        console.log('📝 To install pgvector:');
        console.log('   https://github.com/pgvector/pgvector#installation');
      }
      
      if (!results.tables) {
        console.log('📝 To create embedding tables:');
        console.log('   npm run migrate:up');
      }
      
      if (!results.aiEngine) {
        console.log('📝 To start AI Engine:');
        console.log('   cd ai-engine');
        console.log('   python -m uvicorn app.main:app --port 8000');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Setup check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
