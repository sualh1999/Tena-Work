# TenaWork API Contract

This document serves as the single source of truth for the APIs used in the TenaWork platform. All teams (Frontend, Backend, AI) should adhere to these contracts to ensure smooth integration.

## Base URL

All API routes are prefixed with `/api`.

## Authentication

Protected routes require JWT in the `Authorization` header.

Format:

`Authorization: Bearer <YOUR_JWT>`

## Shared Conventions

### Roles

- `professional`
- `employer`
- `admin`

### Employer Status

- `pending`
- `approved`
- `rejected`

### Job Status

- `active`
- `closed`

### Application Status

- `pending`
- `viewed`
- `shortlisted`
- `rejected`

### Pagination

List endpoints support:

- `page` (default `1`)
- `page_size` (default `20`, max `100`)

List responses use:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 0,
    "total_pages": 0
  }
}
```

### Standard Error Response

All non-2xx responses follow:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

Common codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

---

## 1. Main Backend API (Node.js)

This is the primary API used by frontend clients.

### 1.1 Authentication

#### `POST /auth/register/professional`

Description: Registers a professional and creates initial profile, education, and experience.

Authentication: Public.

Content-Type: `multipart/form-data`

Payload:

- `resume`: file (optional for MVP, recommended)
- `data`: JSON string

```json
{
  "full_name": "Dr. Jane Doe",
  "location": "Addis Ababa",
  "willing_to_travel": true,
  "phone": "+251911123456",
  "email": "jane.doe@example.com",
  "password": "a_strong_password",
  "bio": "Experienced pediatrician with a passion for community health.",
  "languages_spoken": ["Amharic", "English", "Oromo"],
  "education": [
    {
      "institution_name": "Addis Ababa University, College of Health Sciences",
      "degree": "Doctor of Medicine",
      "year": "2015"
    }
  ],
  "experience": [
    {
      "company_name": "Black Lion Hospital",
      "title": "General Practitioner",
      "start_date": "2016-01-01",
      "end_date": "2020-12-31"
    }
  ]
}
```

Success `201`:

```json
{
  "token": "xxxxxxxx.yyyyyy.zzzzzz",
  "user": {
    "id": 1,
    "full_name": "Dr. Jane Doe",
    "email": "jane.doe@example.com",
    "user_type": "professional"
  }
}
```

#### `POST /auth/register/employer`

Description: Registers employer account and company profile in `pending` state.

Authentication: Public.

Content-Type: `multipart/form-data`

Payload:

- `logo`: file (optional)
- `data`: JSON string

```json
{
  "company_name": "Nile Technology Solutions",
  "company_description": "Private healthcare staffing and services company.",
  "full_name": "Muhammed Ali",
  "position": "CTO",
  "phone": "+251912987654",
  "city": "Addis Ababa",
  "address": "Bole Sub-City, Kebele 03/05",
  "email": "ali.m@nts.com",
  "password": "a_strong_password"
}
```

Success `201`:

```json
{
  "token": "xxxxxxxx.yyyyyy.zzzzzz",
  "user": {
    "id": 2,
    "full_name": "Muhammed Ali",
    "email": "ali.m@nts.com",
    "user_type": "employer",
    "company_status": "pending"
  }
}
```

#### `POST /auth/login`

Description: Authenticates user and returns JWT.

Authentication: Public.

Request:

```json
{
  "email": "user@example.com",
  "password": "a_strong_password"
}
```

Success `200`:

```json
{
  "token": "xxxxxxxx.yyyyyy.zzzzzz",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "user_type": "professional"
  }
}
```

#### `GET /auth/me`

Description: Returns authenticated user session info.

Authentication: Required.

Success `200`:

```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Dr. Jane Doe",
  "user_type": "professional",
  "company_status": null
}
```

### 1.2 Profiles

#### `GET /profiles/me`

Description: Returns complete profile of authenticated user.

Authentication: Required.

Success `200` (professional example):

```json
{
  "user_id": 1,
  "full_name": "Dr. Jane Doe",
  "bio": "Experienced pediatrician...",
  "location": "Addis Ababa",
  "phone": "+251911123456",
  "languages_spoken": ["Amharic", "English"],
  "resume_url": "/uploads/resumes/1.pdf",
  "education": [
    { "id": 1, "institution_name": "Medical University", "degree": "MD", "year": "2015" }
  ],
  "experience": [
    {
      "id": 1,
      "company_name": "City Hospital",
      "title": "Pediatrician",
      "start_date": "2018-01-01",
      "end_date": null
    }
  ]
}
```

#### `PUT /profiles/me`

Description: Updates profile fields for authenticated user.

Authentication: Required.

Content-Type:

- `application/json` for text-only updates
- `multipart/form-data` when replacing resume/logo

Request (JSON example):

```json
{
  "full_name": "Dr. Jane Doe",
  "bio": "Experienced pediatrician with 10 years of practice.",
  "languages_spoken": ["Amharic", "English", "French"],
  "education": [
    { "institution_name": "Medical University", "degree": "MD", "year": "2015" }
  ],
  "experience": [
    {
      "company_name": "City Hospital",
      "title": "Pediatrician",
      "start_date": "2018-01-01",
      "end_date": null
    }
  ]
}
```

Success `200`: Updated profile object.

#### `GET /profiles/:user_id`

Description: Returns public professional profile details for candidate review pages.

Authentication: Required (Employer who owns relevant job, or Admin).

Success `200`:

```json
{
  "user_id": 45,
  "full_name": "John Smith",
  "bio": "ICU nurse with 7 years experience.",
  "resume_url": "/uploads/resumes/45.pdf",
  "education": [],
  "experience": []
}
```

### 1.3 Jobs

#### `POST /jobs`

Description: Creates a new job post.

Authentication: Required (Employer with `company_status=approved`).

Request:

```json
{
  "title": "Senior Nurse",
  "description": "We are looking for a senior nurse with ICU experience...",
  "location": "Addis Ababa",
  "salary_range": "40,000 - 50,000 ETB",
  "employment_type": "Full Time",
  "years_of_experience_required": 5,
  "required_languages": ["Amharic", "English"]
}
```

Success `201`:

```json
{
  "id": 123,
  "employer_id": 2,
  "title": "Senior Nurse",
  "description": "We are looking for a senior nurse with ICU experience...",
  "location": "Addis Ababa",
  "salary_range": "40,000 - 50,000 ETB",
  "employment_type": "Full Time",
  "years_of_experience_required": 5,
  "required_languages": ["Amharic", "English"],
  "status": "active",
  "created_at": "2026-02-26T12:00:00Z"
}
```

#### `GET /jobs/:id`

Description: Returns full job details.

Authentication: Required.

Success `200`:

```json
{
  "id": 123,
  "title": "Senior Nurse",
  "description": "Full description...",
  "company": {
    "id": 2,
    "name": "Nile Technology Solutions",
    "logo_url": "/uploads/logos/2.png"
  },
  "location": "Addis Ababa",
  "salary_range": "40,000 - 50,000 ETB",
  "employment_type": "Full Time",
  "years_of_experience_required": 5,
  "required_languages": ["Amharic", "English"],
  "status": "active",
  "created_at": "2026-02-26T12:00:00Z"
}
```

#### `GET /jobs/me`

Description: Returns jobs created by authenticated employer.

Authentication: Required (Employer).

Query params:

- `status` optional (`active` or `closed`)
- pagination params

Success `200`: Paginated list.

#### `PATCH /jobs/:id/status`

Description: Opens/closes a job post.

Authentication: Required (Employer who owns job).

Request:

```json
{
  "status": "closed"
}
```

Success `200`:

```json
{
  "message": "Job status updated successfully."
}
```

#### `GET /jobs/recommended`

Description: Returns top 5 AI-recommended jobs for authenticated professional.

Authentication: Required (Professional).

Success `200`:

```json
{
  "items": [
    {
      "id": 456,
      "title": "Pediatric Nurse",
      "company_name": "General Hospital",
      "location": "Addis Ababa",
      "match_score": 0.95
    }
  ]
}
```

#### `GET /jobs/:id/recommendations`

Description: Returns top 10 AI-recommended candidates for a job.

Authentication: Required (Employer who owns the job).

Internal behavior contract:

- Backend first applies hard filters in DB (country/location, required languages, required experience, and other strict eligibility fields).
- Backend sends only the filtered candidate IDs to AI for semantic re-ranking.
- If no candidates pass hard filters, return empty recommendations.

Success `200`:

```json
{
  "job_id": 123,
  "recommendations": [
    {
      "candidate": {
        "user_id": 45,
        "full_name": "John Smith",
        "headline": "ICU Nurse",
        "location": "Addis Ababa"
      },
      "match_score": 0.92
    }
  ]
}
```

### 1.4 Applications

#### `POST /jobs/:id/apply`

Description: Professional applies to a job.

Authentication: Required (Professional).

Request:

```json
{
  "cover_letter": "I am very interested in this position..."
}
```

Rules:

- Duplicate applications for the same job are rejected (`409 CONFLICT`).
- Job must be `active`.

Success `201`:

```json
{
  "message": "Application submitted successfully.",
  "application_id": 789,
  "status": "pending"
}
```

#### `GET /applications/me`

Description: Gets current professional applications.

Authentication: Required (Professional).

Query params:

- `status` optional (`pending`, `viewed`, `shortlisted`, `rejected`)
- pagination params

Success `200`:

```json
{
  "items": [
    {
      "application_id": 789,
      "job": {
        "id": 123,
        "title": "Senior Nurse",
        "company_name": "General Hospital"
      },
      "status": "viewed",
      "cover_letter": "I am very interested...",
      "applied_at": "2026-02-26T12:00:00Z",
      "updated_at": "2026-02-26T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

#### `GET /jobs/:id/applicants`

Description: Gets applicants for a specific employer job.

Authentication: Required (Employer who owns job).

Behavior:

- Returning this list marks any `pending` applications in this job as `viewed`.

Query params:

- `status` optional (`pending`, `viewed`, `shortlisted`, `rejected`)
- pagination params

Success `200`:

```json
{
  "items": [
    {
      "application_id": 789,
      "status": "viewed",
      "applied_at": "2026-02-26T12:00:00Z",
      "cover_letter": "I am very interested...",
      "candidate": {
        "user_id": 45,
        "full_name": "John Smith",
        "headline": "ICU Nurse",
        "resume_url": "/uploads/resumes/45.pdf"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

#### `PATCH /applications/:id/status`

Description: Employer updates an application status.

Authentication: Required (Employer who owns the job attached to this application).

Allowed transitions:

- `pending -> viewed`
- `viewed -> shortlisted`
- `shortlisted -> viewed`
- `viewed -> rejected`
- `pending -> rejected`

Request:

```json
{
  "status": "shortlisted"
}
```

Success `200`:

```json
{
  "message": "Application status updated successfully.",
  "application_id": 789,
  "status": "shortlisted"
}
```

### 1.5 Admin

#### `GET /admin/employers/pending`

Description: Lists employers awaiting approval.

Authentication: Required (Admin).

Success `200`: Paginated list.

#### `PUT /admin/employers/:id/status`

Description: Approves or rejects employer profile.

Authentication: Required (Admin).

Request:

```json
{
  "status": "approved",
  "reason": "All verification checks passed."
}
```

`reason` required when status is `rejected`.

Success `200`:

```json
{
  "message": "Employer status updated successfully."
}
```

#### `GET /admin/stats`

Description: Returns admin dashboard summary metrics.

Authentication: Required (Admin).

Success `200`:

```json
{
  "total_professionals": 1200,
  "total_approved_employers": 95,
  "total_active_jobs": 140,
  "total_applications": 4800
}
```

---

## 2. AI Engine API (Python/Flask)

This is an internal API used by the backend service only.

Recommended auth between services: shared internal API key in header `X-Internal-Key`.

### `POST /generate-embedding`

Description: Converts text to embedding vector.

Request:

```json
{
  "text": "A piece of text from a job description or user profile."
}
```

Success `200`:

```json
{
  "vector": [0.012, -0.234, 0.567]
}
```

### `POST /recommend-candidates`

Description: Takes a job's vector and a list of candidate IDs to rank, and returns the top matches.

Request:

```json
{
  "job_vector": [0.012, -0.234, 0.567],
  "candidate_ids": [45, 78, 92, 101],
  "limit": 10
}
```

Rules:

- `candidate_ids` is required.
- `limit` is optional; default `10`, max `50`.

Success `200`:

```json
{
  "recommendations": [
    { "id": 92, "score": 0.95 },
    { "id": 45, "score": 0.89 }
  ]
}
```

### `POST /recommend-jobs`

Description: Takes a professional's profile vector and returns the top matching job IDs.

Request:

```json
{
  "profile_vector": [0.345, -0.678, 0.123],
  "limit": 5
}
```

Success `200`:

```json
{
  "recommendations": [
    { "id": 789, "score": 0.98 },
    { "id": 123, "score": 0.91 }
  ]
}
```

## 3. Non-Functional Contract Notes

- Timestamps use ISO-8601 UTC format.
- All list endpoints must be stable-sorted by newest first unless otherwise specified.
- Match scores are normalized to `0.0 - 1.0`.
- File URLs are absolute in production and may be relative in local development.
