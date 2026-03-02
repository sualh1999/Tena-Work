require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('Testing PostgreSQL connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}\n`);

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✓ Connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('\nPostgreSQL version:');
    console.log(result.rows[0].version);
    
    await client.end();
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error('\nError details:');
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nPossible causes:');
      console.error('  1. PostgreSQL is not running');
      console.error('  2. Wrong port number (check pg_hba.conf)');
      console.error('  3. PostgreSQL is not listening on localhost');
    } else if (error.code === '28P01') {
      console.error('\nAuthentication failed - check your password');
    }
  }
}

testConnection();
