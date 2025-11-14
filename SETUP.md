# Resume Screening Application - Setup Guide

## Overview
This project consists of a **Vite + React + TypeScript frontend** and a **Node.js + Express backend** that work together for AI-powered resume screening.

---

## What Was Fixed

### Critical Backend Issues Fixed:
1. **CORS middleware initialization error** - CORS was called before `app` was defined
2. **Wrong table name** - Backend referenced `job_descriptions` table, but DB has `jobs` table
3. **Wrong column names** - Fixed `description` → `jd_text`, `keywords` → `required_skills`
4. **Incorrect Supabase Storage API** - Fixed file upload using correct buffer method and `getPublicUrl()`
5. **Missing authentication** - Added JWT token validation for secure uploads
6. **Wrong database schema** - Updated to match actual `resumes` table structure
7. **Missing start script** - Added `npm start` and `npm run dev` scripts
8. **Missing tmp directory** - Created `backend/tmp/` for multer file uploads
9. **Storage bucket name** - Changed from `uploads` to `resumes` to match Supabase setup

### Frontend Issues Fixed:
1. **Updated ResumeUploader component** - Now uses Supabase auth token for backend requests
2. **Environment variable support** - Added `VITE_BACKEND_URL` for flexible backend connection
3. **Table reference fix** - Updated comments from `job_descriptions` to `jobs` table

### New Files Created:
1. `backend/.env.example` - Backend environment template
2. `.env.example` - Frontend environment template
3. `backend/README.md` - Backend documentation
4. `backend/.gitignore` - Ignore node_modules and .env
5. `backend/tmp/.gitkeep` - Temp upload directory

---

## Prerequisites

1. **Node.js** >= 18.0.0
2. **npm** or **bun**
3. **Supabase account** with project setup
4. **Git**

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/AlonePanda12/Resume-Screeing.git
cd Resume-Screeing
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure Supabase

#### A. Create Storage Bucket
1. Go to your Supabase Dashboard → Storage
2. Create a **public** bucket named `resumes`
3. Set appropriate policies (or make it public for testing)

#### B. Verify Database Tables

Make sure you have these tables in your Supabase database:

**jobs table:**
- `id` (uuid, primary key)
- `owner_id` (uuid, foreign key to auth.users)
- `title` (text)
- `jd_text` (text) - Job description text
- `required_skills` (text[]) - Array of skills
- `department`, `location_country`, `employment_type`, `visibility`, etc.

**resumes table:**
- `id` (uuid, primary key)
- `owner_id` (uuid, foreign key to auth.users)
- `matched_job_id` (uuid, foreign key to jobs)
- `candidate_name` (text)
- `file_url` (text)
- `raw_text` (text)
- `extracted_skills` (text[])
- `match_score` (integer)
- `stage` (text) - e.g., 'new', 'reviewed', 'shortlisted', 'rejected'
- `email`, `phone`, `country`, `visibility`, etc.

If tables don't exist, use the migrations in `supabase/migrations/`

### 5. Environment Variables

#### Frontend (.env)
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_BACKEND_URL=http://localhost:4000
```

#### Backend (backend/.env)
Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=4000
```

**Important:** Use the **service role key** for backend (has elevated permissions)

---

## Running the Application

### Option 1: Run Both Servers Separately (Recommended for Development)

#### Terminal 1 - Backend:
```bash
cd backend
npm start
```

Backend will run on `http://localhost:4000`

#### Terminal 2 - Frontend:
```bash
npm run dev
```

Frontend will run on `http://localhost:8080`

### Option 2: Production Build

#### Build Frontend:
```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

#### Preview Production Build:
```bash
npm run preview
```

---

## Testing the Application

### 1. Create User Account
- Navigate to `http://localhost:8080/auth`
- Sign up with email/password
- Or use demo data by clicking "Load Demo Data" button

### 2. Create a Job
- Go to **Jobs** page
- Click **"New Job"**
- Fill in:
  - Job Title (e.g., "Frontend Developer")
  - Company
  - Location
  - Job Description (detailed text)
  - Required Skills (comma-separated: "React, TypeScript, CSS")
- Click **"Create Job"**
- Note the Job ID from the URL or database

### 3. Upload Resume via Backend API

You can use the `ResumeUploader` component, or test directly with curl:

```bash
# Get your access token first (from browser dev tools or Supabase)
curl -X POST http://localhost:4000/upload-resume \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "resume=@/path/to/resume.pdf" \
  -F "jd_id=YOUR_JOB_ID"
```

### 4. View Results
- Go to **Resumes** page
- You should see the uploaded resume with:
  - Match score percentage
  - Matched skills
  - Candidate information
- Click **"Preview"** to view the resume
- Use pipeline to move between stages

---

## Project Structure

```
Resume-Screeing/
├── backend/
│   ├── server.js          # Express backend server
│   ├── package.json       # Backend dependencies
│   ├── .env              # Backend environment (create this)
│   ├── .env.example      # Backend env template
│   ├── tmp/              # Temporary upload folder
│   └── README.md         # Backend documentation
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── lib/             # Utilities
│   └── integrations/    # Supabase client
├── supabase/
│   ├── functions/       # Edge functions
│   └── migrations/      # Database migrations
├── .env                 # Frontend environment (create this)
├── .env.example         # Frontend env template
└── package.json         # Frontend dependencies
```

---

## API Endpoints

### POST /upload-resume

**Description:** Upload a resume, extract text, score against job description, and save to database.

**Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Body (multipart/form-data):**
- `resume`: File (PDF or DOCX)
- `jd_id`: String (UUID of job from jobs table)

**Response (Success):**
```json
{
  "success": true,
  "score": 85.67,
  "matched": ["react", "typescript", "node", "express"],
  "resume": {
    "id": "uuid",
    "owner_id": "uuid",
    "candidate_name": "John Doe Resume",
    "file_url": "https://...",
    "match_score": 86,
    "extracted_skills": ["react", "typescript", "node", "express"],
    "stage": "new"
  }
}
```

**Response (Error):**
```json
{
  "error": "Job description not found"
}
```

---

## Troubleshooting

### Backend won't start
- Check if port 4000 is already in use: `lsof -i :4000`
- Verify `.env` file exists in `backend/` directory
- Check Supabase credentials are correct

### CORS errors
- Make sure backend is running on `http://localhost:4000`
- Frontend should use `http://localhost:8080`
- Check `VITE_BACKEND_URL` in frontend `.env`

### Upload fails with "Unauthorized"
- Verify you're logged in (check auth state)
- Ensure JWT token is being sent in Authorization header
- Check Supabase service role key in backend `.env`

### Database errors
- Verify table names: `jobs` (not `job_descriptions`) and `resumes`
- Check column names match the schema
- Ensure storage bucket `resumes` exists in Supabase

### File upload fails
- Check `backend/tmp/` directory exists and is writable
- Verify Supabase storage bucket `resumes` exists
- Check file size (default multer limits may apply)

---

## Additional Features

### Frontend Features:
- ✅ User authentication (email/password)
- ✅ Job creation and management
- ✅ Resume upload with drag-and-drop
- ✅ Resume preview (PDF viewer)
- ✅ Resume comparison (side-by-side)
- ✅ Pipeline/Kanban board (drag to move stages)
- ✅ Activity history log
- ✅ User profile management
- ✅ Search and filtering
- ✅ Bulk actions (shortlist, reject, delete)

### Backend Features:
- ✅ PDF text extraction
- ✅ DOCX text extraction
- ✅ Keyword matching algorithm
- ✅ Score calculation
- ✅ Supabase Storage integration
- ✅ JWT authentication
- ✅ Error handling

---

## Next Steps / Future Improvements

1. **AI Enhancement:** Integrate AI models for better resume parsing (use Supabase Edge Functions with Lovable AI Gateway)
2. **Email Notifications:** Send emails to candidates
3. **Interview Scheduling:** Add calendar integration
4. **Report Generation:** Export resume analysis reports
5. **Advanced Scoring:** Semantic matching instead of keyword matching
6. **Multi-language Support:** Support non-English resumes
7. **Batch Upload:** Upload multiple resumes at once
8. **ATS Integration:** Connect with popular ATS systems

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs in the terminal
3. Check browser console for frontend errors
4. Open an issue on GitHub

---

## License

ISC
