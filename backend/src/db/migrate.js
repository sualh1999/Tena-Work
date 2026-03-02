const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

async function ensureMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
}

async function getExecutedMigrations() {
  const result = await pool.query(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return result.rows.map(row => row.name);
}

async function recordMigration(name) {
  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
    [name]
  );
}

async function removeMigration(name) {
  await pool.query(
    `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
    [name]
  );
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

async function runMigration(filename, direction = 'up') {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const sections = content.split('-- DOWN');
  const upSQL = sections[0].replace('-- UP', '').trim();
  const downSQL = sections[1] ? sections[1].trim() : '';

  const sql = direction === 'up' ? upSQL : downSQL;

  if (!sql) {
    throw new Error(`No ${direction.toUpperCase()} section found in ${filename}`);
  }

  console.log(`Running ${direction}: ${filename}`);
  await pool.query(sql);

  if (direction === 'up') {
    await recordMigration(filename);
  } else {
    await removeMigration(filename);
  }

  console.log(`✓ Completed ${direction}: ${filename}`);
}

async function migrateUp() {
  await ensureMigrationsTable();
  
  const executed = await getExecutedMigrations();
  const allMigrations = getMigrationFiles();
  const pending = allMigrations.filter(m => !executed.includes(m));

  if (pending.length === 0) {
    console.log('No pending migrations');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s)`);
  
  for (const migration of pending) {
    await runMigration(migration, 'up');
  }

  console.log('✓ All migrations completed successfully');
}

async function migrateDown() {
  await ensureMigrationsTable();
  
  const executed = await getExecutedMigrations();
  
  if (executed.length === 0) {
    console.log('No migrations to rollback');
    return;
  }

  const lastMigration = executed[executed.length - 1];
  console.log(`Rolling back: ${lastMigration}`);
  
  await runMigration(lastMigration, 'down');
  
  console.log('✓ Rollback completed successfully');
}

function createMigration() {
  const args = process.argv.slice(3);
  const name = args[0];

  if (!name) {
    console.error('Error: Migration name is required');
    console.log('Usage: npm run migrate:create <migration_name>');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const filename = `${timestamp}_${name}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, filename);

  const template = `-- UP
-- Write your migration SQL here


-- DOWN
-- Write your rollback SQL here

`;

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, template);
  console.log(`✓ Created migration: ${filename}`);
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;
      case 'down':
        await migrateDown();
        break;
      case 'create':
        createMigration();
        break;
      default:
        console.log('Usage:');
        console.log('  npm run migrate:up    - Run pending migrations');
        console.log('  npm run migrate:down  - Rollback last migration');
        console.log('  npm run migrate:create <name> - Create new migration');
        process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateUp, migrateDown };
