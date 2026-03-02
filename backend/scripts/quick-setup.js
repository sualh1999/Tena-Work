const { Client } = require('pg');

async function setup() {
  // Connect without database
  let client = new Client({
    host: 'localhost',
    port: 3036,
    user: 'postgres',
    password: '4545'
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Check/create database
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname='tenawork_db'"
    );

    if (result.rows.length === 0) {
      await client.query('CREATE DATABASE tenawork_db');
      console.log('✓ Created database: tenawork_db');
    } else {
      console.log('✓ Database already exists: tenawork_db');
    }

    await client.end();

    // Connect to the database
    client = new Client({
      host: 'localhost',
      port: 3036,
      user: 'postgres',
      password: '4545',
      database: 'tenawork_db'
    });

    await client.connect();
    console.log('✓ Connected to tenawork_db');

    // Create extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ Created uuid-ossp extension');

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "vector"');
      console.log('✓ Created vector extension');
    } catch (error) {
      console.warn('⚠ Warning: pgvector extension not available');
      console.warn('  Install from: https://github.com/pgvector/pgvector');
    }

    await client.end();

    console.log('\n✓ Database setup completed!');
    console.log('\nNext steps:');
    console.log('  1. npm run migrate:up');
    console.log('  2. npm run db:seed');
    console.log('  3. npm run dev');

  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
