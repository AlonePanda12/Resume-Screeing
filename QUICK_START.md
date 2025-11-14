# 🚀 Quick Start Guide

## Prerequisites
- Node.js >= 18.0.0
- Supabase account

## Setup (5 minutes)

### 1. Create .env files

**Frontend `.env`:**
```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_BACKEND_URL=http://localhost:4000
EOF
```

**Backend `backend/.env`:**
```bash
cat > backend/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
PORT=4000
EOF
```

### 2. Start Backend

```bash
cd backend
npm start
```

### 3. Start Frontend (New Terminal)

```bash
npm run dev
```

### 4. Open Browser

Navigate to: **http://localhost:8080**

## Test Flow

1. **Sign Up** at `/auth`
2. **Create Job** at `/jobs/new`
3. **Upload Resume** at `/resumes`
4. **View Score** and manage pipeline

---

## Full Documentation

- 📖 **SETUP.md** - Complete setup guide
- 🔧 **FIXES_SUMMARY.md** - All fixes explained
- 🔌 **backend/README.md** - API documentation

## Troubleshooting

**Backend won't start?**
```bash
cd backend
npm install
npm start
```

**Frontend errors?**
```bash
npm install
npm run dev
```

**Need help?** Check SETUP.md → Troubleshooting section
