# TenaWork API Endpoint Documentation

This document serves as a comprehensive guide for frontend developers and a reference for setting up Postman collections.

**Base URL**: `http://localhost:5000/api`

---

## Authentication & Authorization

Most endpoints require a JWT token in the Authorization header.
```
Authorization: Bearer <your_jwt_token_here>
```

---

## 1. Auth Endpoints

### 1.1 Register Professional
**POST** `/auth/register/professional`
- **Auth**: None
- **Content-Type**: `multipart/form-data` (if uploading resume) or `application/json`
- **Body (`application/json`)**:
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123",
  "phone": "+251911234567",
  "location": "Addis Ababa",
  "willing_to_travel": true,
  "bio": "Experienced ICU nurse.",
  "languages_spoken": ["English", "Amharic"],
  "education": [
    { "institution_name": "AAU", "degree": "BSc Nursing", "field_of_study": "Nursing", "year": "2020" }
  ],
  "experience": [
    { "company_name": "Black Lion", "title": "ICU Nurse", "start_date": "2021-01-01" }
  ]
}
```
*Note: If sending via `multipart/form-data` (to include `resume` file), wrap the JSON above as a string in a form field named `data`.*

### 1.2 Register Employer
**POST** `/auth/register/employer`
- **Auth**: None
- **Content-Type**: `multipart/form-data` (if uploading logo) or `application/json`
- **Body (`application/json`)**:
```json
{
  "full_name": "John Smith",
  "email": "hr@hospital.com",
  "password": "Password@123",
  "phone": "+251911234568",
  "company_name": "City Hospital",
  "company_description": "Leading healthcare provider",
  "position": "HR Manager",
  "city": "Addis Ababa",
  "address": "Bole Road"
}
```
*Note: If uploading `logo`, wrap JSON in `data` field.*

### 1.3 Login
**POST** `/auth/login`
- **Auth**: None
- **Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password@123"
}
```
- **Response**: `{ "token": "eyJ...", "user": { ... } }`

### 1.4 Get Current User
**GET** `/auth/me`
- **Auth**: Required (Any role)
- **Response**: User basic details and `company_status` (for employers).

---

## 2. Profiles Endpoints

### 2.1 Get My Profile
**GET** `/profiles/me`
- **Auth**: Required (Any role)
- **Response**: Full profile details based on user type (professional or employer).

### 2.2 Update My Profile
**PUT** `/profiles/me`
- **Auth**: Required (Professional or Employer)
- **Content-Type**: `multipart/form-data`
- **Body**: Same structure as Registration endpoints, wrapped in `data` field. Include `resume` or `logo` file if updating it.

### 2.3 Get Candidate Profile (Employer/Admin Only)
**GET** `/profiles/:user_id`
- **Auth**: Required (Employer or Admin)
- **Response**: Candidate's public profile, education, and experience.

---

## 3. Jobs Endpoints

### 3.1 Create Job
**POST** `/jobs`
- **Auth**: Required (Approved Employer only)
- **Body**:
```json
{
  "title": "Senior Nurse",
  "description": "Looking for ICU experienced nurse",
  "location": "Addis Ababa",
  "salary_range": "20000-30000 ETB",
  "employment_type": "full-time",
  "years_of_experience_required": 3,
  "required_languages": ["Amharic", "English"]
}
```

### 3.2 Get Job Details
**GET** `/jobs/:id`
- **Auth**: Required (Any role)

### 3.3 Get My Posted Jobs (Employer)
**GET** `/jobs/me?status=active&page=1&page_size=20`
- **Auth**: Required (Employer only)
- **Query Params**: `status` (active/closed), `page`, `page_size`

### 3.4 Update Job Status
**PATCH** `/jobs/:id/status`
- **Auth**: Required (Employer ONLY, must own the job)
- **Body**:
```json
{
  "status": "closed"
}
```

### 3.5 Get Recommended Jobs (Professional)
**GET** `/jobs/recommended`
- **Auth**: Required (Professional only)
- **Description**: Returns top 5 AI-recommended jobs based on the professional's profile.

### 3.6 Get Recommended Candidates (Employer)
**GET** `/jobs/:id/recommendations`
- **Auth**: Required (Employer only, must own the job)
- **Description**: Returns top 10 AI-recommended candidates for the specific job.

---

## 4. Applications Endpoints

### 4.1 Apply to Job
**POST** `/jobs/:id/apply`
- **Auth**: Required (Professional only)
- **Body**:
```json
{
  "cover_letter": "I am very interested in this position..."
}
```

### 4.2 Get Job Applicants (Employer)
**GET** `/jobs/:id/applicants?page=1&page_size=20`
- **Auth**: Required (Employer only, must own the job)
- **Description**: Automatically changes "pending" applications to "viewed" when fetched.

### 4.3 Get My Applications (Professional)
**GET** `/applications/me?page=1&page_size=20`
- **Auth**: Required (Professional only)

### 4.4 Update Application Status (Employer)
**PATCH** `/applications/:id/status`
- **Auth**: Required (Employer only)
- **Body**:
```json
{
  "status": "shortlisted" // or "rejected"
}
```

---

## 5. Admin Endpoints

### 5.1 Get Pending Employers
**GET** `/admin/employers/pending?page=1&page_size=20`
- **Auth**: Required (Admin only)

### 5.2 Approve/Reject Employer
**PUT** `/admin/employers/:id/status`
- **Auth**: Required (Admin only)
- **Body**:
```json
{
  "status": "approved", // or "rejected"
  "reason": "Optional reason (required if rejected)"
}
```

### 5.3 Get Platform Stats
**GET** `/admin/stats`
- **Auth**: Required (Admin only)
- **Response**: Counts of professionals, employers, active jobs, and total applications.

---

## Common Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

Common Error Codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_SERVER_ERROR` (500)
