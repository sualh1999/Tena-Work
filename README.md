# TenaWork - AI-Powered Healthcare Job Matching Platform

TenaWork is a bidirectional job matching platform specifically designed for healthcare professionals and institutions in Ethiopia. It uses AI-powered semantic matching to connect the right candidates with the right opportunities.

## 🎯 Key Features

- **AI-Powered Matching**: Semantic embeddings for intelligent job and candidate recommendations
- **Bidirectional Recommendations**: 
  - Top 5 job recommendations for professionals
  - Top 10 candidate recommendations for employers
- **Employer Approval Workflow**: Admin verification before employers can post jobs
- **Comprehensive Profiles**: Education, experience, skills, and preferences
- **Application Management**: Track application status from submission to decision

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │  (React - Coming Soon)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Backend (Node.js + Express)     │  ✅ COMPLETE
│    - REST API                       │
│    - JWT Authentication             │
│    - PostgreSQL Database            │
│    - File Upload (Resume/Logo)      │
└────────┬────────────────────────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐  ┌──────────────────┐
│   AI    │  │   PostgreSQL     │  ✅ COMPLETE
│ Engine  │  │   + pgvector     │
│ (Python)│  │   Port: 3036     │
└─────────┘  └──────────────────┘
```

## 📁 Project Structure

```
Tena-Work/
├── backend/                    # Node.js Backend (✅ Complete)
│   ├── src/
│   │   ├── controllers/       # API Controllers
│   │   ├── models/            # Database Models
│   │   ├── routes/            # API Routes
│   │   ├── middleware/        # Auth & Error Handling
│   │   ├── services/          # AI Service Integration
│   │   ├── utils/             # Utilities
│   │   └── db/                # Migrations & Seeds
│   ├── scripts/               # Setup Scripts
│   └── uploads/               # File Storage
│
├── ai-engine/                 # Python AI Engine (✅ Complete)
│   ├── app/
│   │   ├── main.py           # FastAPI Application
│   │   ├── services/         # Embedding & Recommendation
│   │   └── db/               # Database Queries
│   └── migrations/           # pgvector Setup
│
└── docs/                      # Documentation
    ├── PROJECT_OVERVIEW.md
    ├── API_CONTRACT.md
    ├── AI_ENGINE_EXPLAINED.md
    ├── AI_INTEGRATION_COMPLETE.md
    └── QUICK_START_AI.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Python 3.8+

### 1. Clone Repository

```bash
git clone <repository-url>
cd Tena-Work
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate:up
npm run db:seed
```

### 3. Setup AI Engine

```bash
cd ai-engine
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```

### 4. Verify Integration

```bash
cd backend
npm run setup:ai
```

### 5. Start Backend

```bash
npm run dev
```

Backend runs on: http://localhost:5001

## 📚 Documentation

- **[Quick Start Guide](QUICK_START_AI.md)** - Get up and running in 5 minutes
- **[API Contract](API_CONTRACT.md)** - Complete API documentation
- **[AI Integration](backend/AI_INTEGRATION_COMPLETE.md)** - Technical details
- **[AI Engine Explained](AI_ENGINE_EXPLAINED.md)** - How the AI works
- **[API Testing Guide](API_TESTING_GUIDE.md)** - Postman collection guide

## 🔑 Key Endpoints

### Authentication
- `POST /auth/register/professional` - Register as healthcare professional
- `POST /auth/register/employer` - Register as employer
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Profiles
- `GET /profiles/me` - Get my profile
- `PUT /profiles/me` - Update my profile
- `GET /profiles/:user_id` - View candidate profile (employer only)

### Jobs
- `POST /jobs` - Create job (approved employer only)
- `GET /jobs/:id` - Get job details
- `GET /jobs/me` - Get my jobs (employer)
- `GET /jobs/recommended` - Get AI recommendations (professional)
- `GET /jobs/:id/recommendations` - Get candidate recommendations (employer)

### Applications
- `POST /jobs/:id/apply` - Apply to job
- `GET /applications/me` - My applications
- `GET /jobs/:id/applicants` - Job applicants (employer)
- `PATCH /applications/:id/status` - Update application status

### Admin
- `GET /admin/employers/pending` - Pending employers
- `PUT /admin/employers/:id/status` - Approve/reject employer
- `GET /admin/stats` - Dashboard statistics

## 🧪 Testing

### Using Postman

1. Import collection: `backend/TenaWork_API.postman_collection.json`
2. Set environment variables (auto-configured)
3. Test endpoints following `API_TESTING_GUIDE.md`

### Test Accounts

Test accounts are configured via environment variables.
See `backend/README.md` for details on setting initial passwords.

```
Admin:
  Email: admin@tenawork.com

Professional:
  Email: jane.doe@example.com

Employer:
  Email: recruiter@hospital.com
```

## 🤖 AI Features

### How It Works

1. **Embedding Generation**: Text → 384-dimensional vector using sentence-transformers
2. **Semantic Matching**: Cosine similarity between job and candidate vectors
3. **Smart Filtering**: Hard filters (location, languages, experience) before AI ranking
4. **Automatic Updates**: Embeddings regenerated on profile/job updates

### Recommendation Flow

**For Professionals (Job Recommendations)**:
1. System fetches candidate embedding
2. AI compares with all active job embeddings
3. Returns top 5 matches with scores

**For Employers (Candidate Recommendations)**:
1. Apply hard filters (location, languages, experience)
2. Send filtered candidate IDs to AI
3. AI ranks by semantic similarity
4. Returns top 10 matches with scores

## 🛠️ Technology Stack

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL + pgvector
- **Authentication**: JWT
- **File Upload**: Multer
- **Validation**: express-validator

### AI Engine
- **Framework**: FastAPI
- **ML Model**: sentence-transformers/all-MiniLM-L6-v2
- **Vector Search**: pgvector with cosine similarity
- **Embeddings**: 384 dimensions

## 📊 Database Schema

- **users** - User accounts (professional, employer, admin)
- **professional_profiles** - Healthcare professional details
- **employer_profiles** - Company information
- **education** - Educational background
- **work_experience** - Work history
- **jobs** - Job postings
- **applications** - Job applications
- **job_embeddings** - Job vector embeddings (384-dim)
- **candidate_embeddings** - Candidate vector embeddings (384-dim)

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Internal API key for AI Engine

## 🚧 Development Status

- ✅ Backend API - Complete
- ✅ AI Engine - Complete
- ✅ Database Schema - Complete
- ✅ AI Integration - Complete
- ✅ Authentication & Authorization - Complete
- ✅ File Upload - Complete
- ✅ API Documentation - Complete
- ⏳ Frontend - Coming Soon

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=3036
DB_NAME=tenawork_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=7d

# AI Engine
AI_ENGINE_URL=http://localhost:8000
AI_INTERNAL_KEY=replace-with-secure-api-key

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

Developed by Nile Technology Solutions

## 📞 Support

For issues and questions:
- Check documentation in `/docs`
- Review API contract: `API_CONTRACT.md`
- See troubleshooting: `QUICK_START_AI.md`

---

**Status**: Backend & AI Integration Complete ✅ | Frontend In Progress ⏳
