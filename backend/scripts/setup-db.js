const { Client } = require('pg');
const crypto = require('crypto');

async function setupDatabase() {
  // Connect to PostgreSQL without specifying a database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'tenawork_db';
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Created database: ${dbName}`);
    } else {
      console.log(`✓ Database already exists: ${dbName}`);
    }

    await client.end();

    // Now connect to the new database to create extensions
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName,
    });

    await dbClient.connect();
    console.log(`✓ Connected to database: ${dbName}`);

    // Create extensions
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ Created uuid-ossp extension');

    try {
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "vector"');
      console.log('✓ Created vector extension');
    } catch (error) {
      console.warn('⚠ Warning: Could not create vector extension. You may need to install pgvector.');
      console.warn('  Install from: https://github.com/pgvector/pgvector');
    }

    await dbClient.end();

    console.log('\n✓ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run migrations: npm run migrate:up');
    console.log('  2. Seed database: npm run db:seed');
    console.log('  3. Start server: npm run dev');

  } catch (error) {
    console.error('Setup error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Cannot connect to PostgreSQL.');
      console.error('   Make sure PostgreSQL is running and credentials are correct in .env file');
    }
    process.exit(1);
  }
}

// Generate JWT secret
function generateJWTSecret() {
  const secret = crypto.randomBytes(64).toString('hex');
  console.log('\n🔐 Generated JWT Secret:');
  console.log(secret);
  console.log('\nAdd this to your .env file:');
  console.log(`JWT_SECRET=${secret}`);
}

// Run setup
if (require.main === module) {
  require('dotenv').config();
  
  console.log('=== TenaWork Database Setup ===\n');
  
  if (process.argv.includes('--generate-jwt')) {
    generateJWTSecret();
  } else {
    setupDatabase();
  }
}

module.exports = { setupDatabase, generateJWTSecret };
