# TenaWork Backend API

Professional Node.js + Express backend for TenaWork - AI-Powered Healthcare Job Matching Platform.

> **API Documentation**: For a complete list of endpoints, request bodies, and Postman setup, see [API_ENDPOINTS.md](./API_ENDPOINTS.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (with pgvector extension for AI features)
- Git

### Installation

1. **Clone and navigate to backend:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
PORT=5001

# Database (Update with your PostgreSQL credentials)
DB_HOST=localhost
DB_PORT=3036
DB_NAME=tenawork_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret (Use the generated one or create new)
JWT_SECRET=replace_with_secure_secret
```

4. **Setup database:**
```bash
# Create database and extensions
npm run db:setup

# Run migrations
npm run migrate:up

# Seed initial data (optional)
npm run db:seed
```

5. **Start server:**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will be running at: `http://localhost:5001`

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   └── database.js      # PostgreSQL connection pool
│   │
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── profileController.js
│   │   ├── jobController.js
│   │   ├── applicationController.js
│   │   └── adminController.js
│   │
│   ├── models/              # Database models
│   │   ├── User.js
│   │   ├── ProfessionalProfile.js
│   │   ├── EmployerProfile.js
│   │   ├── Education.js
│   │   ├── WorkExperience.js
│   │   ├── Job.js
│   │   └── Application.js
│   │
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── profiles.js
│   │   ├── jobs.js
│   │   ├── applications.js
│   │   └── admin.js
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── errorHandler.js  # Global error handler
│   │   └── notFound.js      # 404 handler
│   │
│   ├── utils/               # Utility functions
│   │   ├── validation.js    # Input validation
│   │   ├── errors.js        # Custom error classes
│   │   ├── jwt.js           # JWT helpers
│   │   ├── password.js      # Password hashing
│   │   ├── response.js      # Response formatters
│   │   └── fileUpload.js    # File upload config
│   │
│   ├── db/                  # Database
│   │   ├── migrations/      # SQL migrations
│   │   ├── migrate.js       # Migration runner
│   │   └── seed.js          # Database seeding
│   │
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
│
├── scripts/                 # Utility scripts
├── uploads/                 # File uploads
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:5001/api`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register/professional` | Register professional | Public |
| POST | `/auth/register/employer` | Register employer | Public |
| POST | `/auth/login` | User login | Public |
| GET | `/auth/me` | Get current user | Required |

### Profiles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/profiles/me` | Get my profile | Required |
| PUT | `/profiles/me` | Update my profile | Required |
| GET | `/profiles/:user_id` | Get user profile | Employer/Admin |

### Jobs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/jobs` | Create job | Approved Employer |
| GET | `/jobs/:id` | Get job details | Required |
| GET | `/jobs/me` | Get my jobs | Employer |
| PATCH | `/jobs/:id/status` | Update job status | Employer |
| GET | `/jobs/recommended` | Get recommended jobs | Professional |
| GET | `/jobs/:id/recommendations` | Get candidate recommendations | Employer |
| POST | `/jobs/:id/apply` | Apply to job | Professional |
| GET | `/jobs/:id/applicants` | Get job applicants | Employer |

### Applications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/applications/me` | Get my applications | Professional |
| PATCH | `/applications/:id/status` | Update application status | Employer |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/employers/pending` | Get pending employers | Admin |
| PUT | `/admin/employers/:id/status` | Approve/reject employer | Admin |
| GET | `/admin/stats` | Get platform statistics | Admin |

---

## 🔐 Authentication

All protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

1. **Register** or **Login** to get a token
2. Token is returned in the response
3. Include token in subsequent requests

Example:
```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token
curl http://localhost:5001/api/profiles/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 👥 User Roles

### Professional (Health Worker)
- Create and manage profile
- Browse and apply to jobs
- Track application status
- View AI-recommended jobs

### Employer (Healthcare Institution)
- Register company (requires admin approval)
- Post and manage jobs
- View applicants
- Get AI-recommended candidates
- Manage application status

### Admin (Platform Administrator)
- Approve/reject employers
- View platform statistics
- Monitor platform activity

---

## 🧪 Testing

### Test Accounts

Test accounts are created during the seeding process.
You must set the following environment variables before running `npm run db:seed`:
- `ADMIN_INIT_PASSWORD`
- `PROFESSIONAL_INIT_PASSWORD`
- `EMPLOYER_INIT_PASSWORD`

If not set, the seeding script will fail.

```
Admin:
  Email: admin@tenawork.com
  Password: (The value you set for ADMIN_INIT_PASSWORD)

Professional:
  Email: jane.doe@example.com
  Password: (The value you set for PROFESSIONAL_INIT_PASSWORD)

Employer (Pre-approved):
  Email: recruiter@hospital.com
  Password: (The value you set for EMPLOYER_INIT_PASSWORD)
```

### Using Postman

1. Import the collection: `TenaWork_API.postman_collection.json`
2. Set base URL: `http://localhost:5001`
3. Login with test account
4. Token is auto-saved for subsequent requests

### Manual Testing

```bash
# Health check
curl http://localhost:5001/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.doe@example.com","password":"Professional@123"}'
```

### Automated Testing

```bash
# Run API tests
node test-api.js
```

---

## 📊 Database

### Schema

8 tables with proper relationships:
- `users` - Core authentication
- `professional_profiles` - Professional data
- `employer_profiles` - Company data
- `education` - Educational background
- `work_experience` - Work history
- `jobs` - Job postings
- `applications` - Job applications
- `schema_migrations` - Migration tracking

### Migrations

```bash
# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create <migration_name>
```

### Seeding

```bash
# Seed database with test data
npm run db:seed
```

---

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload (nodemon)
npm start                # Start production server

# Database
npm run migrate:up       # Run pending migrations
npm run migrate:down     # Rollback last migration
npm run migrate:create   # Create new migration
npm run db:seed          # Seed database
npm run db:setup         # Setup database (create + extensions)

# Utilities
npm run generate:jwt     # Generate new JWT secret
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `tenawork_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `UPLOAD_DIR` | Upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file size (bytes) | `5242880` (5MB) |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |

### File Uploads

**Supported file types:**
- Resumes: PDF, DOC, DOCX
- Logos: JPEG, PNG, GIF

**Size limit:** 5MB (configurable via `MAX_FILE_SIZE`)

**Storage:** Local filesystem in `uploads/` directory

---

## 🛡️ Security Features

- ✅ **Password Hashing**: Bcrypt with 10 salt rounds
- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Role-Based Access Control**: Professional, Employer, Admin
- ✅ **Input Validation**: Express-validator on all endpoints
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **File Upload Security**: Type and size validation
- ✅ **CORS Protection**: Configurable allowed origins
- ✅ **Helmet.js**: Security headers
- ✅ **Error Sanitization**: Production mode hides internals

---

## 📦 Dependencies

### Core
- `express` - Web framework
- `pg` - PostgreSQL client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `dotenv` - Environment variables

### Middleware
- `cors` - CORS handling
- `helmet` - Security headers
- `morgan` - HTTP logging
- `multer` - File uploads
- `express-validator` - Input validation

### Development
- `nodemon` - Auto-reload during development

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `ECONNREFUSED`

**Solution:**
1. Check PostgreSQL is running
2. Verify credentials in `.env`
3. Check port number (might not be default 5432)

```bash
# Check PostgreSQL service
Get-Service postgresql*

# Find PostgreSQL port
Get-Content "C:\Program Files\PostgreSQL\18\data\postgresql.conf" | Select-String "port"
```

### Port Already in Use

**Error:** `EADDRINUSE`

**Solution:**
```bash
# Change PORT in .env
PORT=5002

# Or kill process using the port
Get-Process -Name node | Stop-Process -Force
```

### Migration Errors

**Error:** Migration fails

**Solution:**
1. Check database connection
2. Verify migration file syntax
3. Check `schema_migrations` table

```bash
# Reset migrations (CAUTION: Drops all data)
npm run migrate:down
npm run migrate:up
```

### File Upload Errors

**Error:** File upload fails

**Solution:**
1. Check `uploads/` directory exists
2. Verify file type is allowed
3. Check file size < 5MB
4. Ensure correct field name (`resume` or `logo`)

---

## 📚 Documentation

- `README.md` - This file
- `BACKEND_STRUCTURE.md` - Architecture details
- `DATABASE_SCHEMA.md` - Database design
- `API_TESTING_GUIDE.md` - Postman testing guide
- `IMPLEMENTATION_COMPLETE.md` - Implementation checklist

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production database
- [ ] Set up SSL/TLS
- [ ] Configure CORS for production domain
- [ ] Set up file storage (S3, etc.)
- [ ] Enable logging
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Review security headers

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
PORT=5001
DB_HOST=your-production-db-host
DB_NAME=tenawork_production
JWT_SECRET=replace-with-production-secret-key
CORS_ORIGIN=https://your-domain.com
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit pull request

### Code Style

- Use ES6+ features
- Follow existing patterns
- Add comments for complex logic
- Use meaningful variable names
- Keep functions small and focused

---

## 📄 License

ISC

---

## 👨‍💻 Development Team

**Organization:** Nile Technology Solutions (NTS)

**Project:** TenaWork - AI-Powered Healthcare Job Platform

---

## 📞 Support

For issues or questions:
1. Check documentation
2. Review troubleshooting section
3. Check existing issues
4. Contact development team

---

## ✅ Status

**Backend Status:** ✅ Complete and Functional

- ✅ All endpoints implemented
- ✅ Database setup complete
- ✅ Authentication working
- ✅ File uploads working
- ✅ Error handling implemented
- ✅ Documentation complete
- ✅ Ready for frontend integration

**Last Updated:** February 27, 2026

---

## 🎯 Next Steps

1. **Test all endpoints** using Postman collection
2. **Integrate with frontend** application
3. **Implement AI engine** for recommendations
4. **Add unit tests** for critical functions
5. **Set up CI/CD** pipeline
6. **Deploy to staging** environment

---

**Built by Nile Technology Solutions**

*Serving Humanity is a Blessing*
