# Resume Screening Backend

Express.js backend server for resume parsing and scoring.

## Features

- Resume text extraction from PDF and DOCX files
- Keyword matching and scoring against job descriptions
- Supabase integration for data storage
- File upload to Supabase Storage

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=4000
```

3. Start the server:
```bash
npm start
```

Server will run on `http://localhost:4000`

## API Endpoints

### POST /upload-resume

Upload and score a resume against a job description.

**Headers:**
- `Authorization: Bearer <supabase_access_token>`

**Form Data:**
- `resume`: PDF or DOCX file
- `jd_id`: Job ID from the jobs table

**Response:**
```json
{
  "success": true,
  "score": 85.5,
  "matched": ["react", "typescript", "node"],
  "resume": {
    "id": "...",
    "file_url": "...",
    "match_score": 86
  }
}
```

## Requirements

- Node.js >= 18.0.0
- Supabase project with:
  - `jobs` table
  - `resumes` table
  - `resumes` storage bucket
