const pool = require('../config/database');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Seeding database...');

    // Check if admin already exists
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@tenawork.com']
    );

    if (adminCheck.rows.length > 0) {
      console.log('Admin user already exists, skipping seed');
      await client.query('ROLLBACK');
      return;
    }

    // Create admin user
    const adminPasswordPlain = process.env.ADMIN_INIT_PASSWORD;
    if (!adminPasswordPlain) {
      console.error('Error: ADMIN_INIT_PASSWORD environment variable is not set.');
      process.exit(1);
    }
    const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['admin@tenawork.com', adminPassword, 'Platform Administrator', 'admin', '+251911000000']
    );

    console.log(`✓ Created admin user (email: admin@tenawork.com)`);

    // Create sample professional
    const professionalPasswordPlain = process.env.PROFESSIONAL_INIT_PASSWORD;
    if (!professionalPasswordPlain) {
        console.error('Error: PROFESSIONAL_INIT_PASSWORD environment variable is not set.');
        process.exit(1);
    }
    const professionalPassword = await bcrypt.hash(professionalPasswordPlain, 10);
    const professionalResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['jane.doe@example.com', professionalPassword, 'Dr. Jane Doe', 'professional', '+251911123456']
    );

    const professionalId = professionalResult.rows[0].id;

    // Create professional profile
    await client.query(
      `INSERT INTO professional_profiles (user_id, bio, location, willing_to_travel, languages_spoken)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        professionalId,
        'Experienced pediatrician with a passion for community health and child welfare.',
        'Addis Ababa',
        true,
        ['Amharic', 'English', 'Oromo']
      ]
    );

    // Add education
    await client.query(
      `INSERT INTO education (user_id, institution_name, degree, field_of_study, year)
       VALUES ($1, $2, $3, $4, $5)`,
      [professionalId, 'Addis Ababa University', 'Doctor of Medicine', 'Pediatrics', '2015']
    );

    // Add work experience
    await client.query(
      `INSERT INTO work_experience (user_id, company_name, title, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        professionalId,
        'Black Lion Hospital',
        'General Practitioner',
        '2016-01-01',
        '2020-12-31',
        'Provided primary care services to diverse patient population'
      ]
    );

    console.log(`✓ Created sample professional (email: jane.doe@example.com)`);

    // Create sample employer
    const employerPasswordPlain = process.env.EMPLOYER_INIT_PASSWORD;
    if (!employerPasswordPlain) {
        console.error('Error: EMPLOYER_INIT_PASSWORD environment variable is not set.');
        process.exit(1);
    }
    const employerPassword = await bcrypt.hash(employerPasswordPlain, 10);
    const employerResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['recruiter@hospital.com', employerPassword, 'Muhammed Ali', 'employer', '+251912987654']
    );

    const employerId = employerResult.rows[0].id;

    // Create employer profile (approved for testing)
    await client.query(
      `INSERT INTO employer_profiles (user_id, company_name, company_description, position, city, address, company_status, approved_at, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [
        employerId,
        'General Hospital',
        'Leading healthcare provider in Addis Ababa',
        'HR Manager',
        'Addis Ababa',
        'Bole Sub-City, Kebele 03/05',
        'approved',
        adminResult.rows[0].id
      ]
    );

    console.log(`✓ Created sample employer (email: recruiter@hospital.com)`);

    await client.query('COMMIT');
    console.log('✓ Database seeded successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed error:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
