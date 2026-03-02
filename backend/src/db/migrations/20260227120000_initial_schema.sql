-- UP
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: vector extension will be added later when pgvector is installed

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('professional', 'employer', 'admin')),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);

-- Create professional_profiles table (without vector column for now)
CREATE TABLE professional_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  location VARCHAR(255),
  willing_to_travel BOOLEAN DEFAULT FALSE,
  languages_spoken TEXT[] DEFAULT '{}',
  resume_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_professional_profiles_location ON professional_profiles(location);

-- Create education table
CREATE TABLE education (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_name VARCHAR(255) NOT NULL,
  degree VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255),
  year VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_education_user_id ON education(user_id);

-- Create work_experience table
CREATE TABLE work_experience (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);

-- Create employer_profiles table
CREATE TABLE employer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_description TEXT,
  position VARCHAR(255),
  city VARCHAR(255),
  address TEXT,
  logo_url VARCHAR(500),
  company_status VARCHAR(20) DEFAULT 'pending' CHECK (company_status IN ('pending', 'approved', 'rejected')),
  approval_reason TEXT,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employer_profiles_status ON employer_profiles(company_status);
CREATE INDEX idx_employer_profiles_city ON employer_profiles(city);

-- Create jobs table (without vector column for now)
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  salary_range VARCHAR(100),
  employment_type VARCHAR(50),
  years_of_experience_required INTEGER DEFAULT 0,
  required_languages TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);

-- Create applications table
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'rejected')),
  applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);

-- DOWN
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS employer_profiles CASCADE;
DROP TABLE IF EXISTS work_experience CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS professional_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp";
