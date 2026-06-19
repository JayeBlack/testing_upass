# UPASS Project Cleanup Guide

## ✅ Files to DELETE (Safe to Remove)

### Root Directory - Debug/Report Markdown Files
These were temporary troubleshooting documents:
- `ANALYTICS_DASHBOARD_REPORT.md`
- `ANALYTICS_FIX_FINAL.md`
- `ANALYTICS_FIX_SUMMARY.md`
- `EXAMS_OFFICER_STUDENTS_FIX.md`
- `FINAL_SYSTEM_CHECK_REPORT.md`
- `FULL_IMPLEMENTATION_COMPLETE.md`
- `QUICK_FIX_STEPS.md`
- `RESTART_BACKEND_NOW.md`
- `STUDENT_COUNT_FIX.md`
- `SYSTEM_COMPLIANCE_REPORT.md`
- `SYSTEM_OVERVIEW_&_USER_RELATIONSHIPS.md`
- `SYSTEM_STATUS_REPORT.md`

### Backend - One-Time/Debug Scripts
These were used during development and are no longer needed:
- `backend/add_missing_departments.js` ➜ **Replaced by migrations**
- `backend/check_mechanical_eng.js` ➜ **One-time check, no longer needed**
- `backend/debug_perry_students.js` ➜ **Debug script, no longer needed**
- `backend/fix_prof_perry.js` ➜ **One-time fix, no longer needed**
- `backend/test_analytics_api.js` ➜ **Debug test, no longer needed**
- `backend/test_api.js` ➜ **Debug test, no longer needed**
- `backend/test_fees_endpoint.js` ➜ **Debug test, no longer needed**
- `backend/test_live_api.js` ➜ **Debug test, no longer needed**
- `backend/test-endpoint.js` ➜ **Debug test, no longer needed**
- `backend/test-query.js` ➜ **Debug test, no longer needed**
- `backend/update_academic_year.js` ➜ **One-time schema change, no longer needed**
- `backend/update_user_departments.js` ➜ **One-time data fix, no longer needed**

### Backend - SQL Debug Files
These were used for manual database inspection:
- `backend/check_departments.sql` ➜ **Use verify_departments.js instead**
- `backend/fix_programme_names.sql` ➜ **One-time fix, already applied**
- `backend/verify_student_data.sql` ➜ **Use check_db.js instead**

### Root Directory - Sample Files
- `sample_accountant_payments.xlsx` ➜ **If no longer needed for testing**

---

## ⚠️ Files to KEEP (Still Useful)

### Backend - Essential Scripts
Your team should run these:

**Must Run on Setup:**
- `backend/run_migrations.js` ➜ **Run this first to populate departments**
- `backend/create_superadmin.js` ➜ **Create first admin account**

**Verification Scripts:**
- `backend/check_db.js` ➜ **Database health check**
- `backend/check_students.js` ➜ **Verify student data integrity**
- `backend/check_table_structure.js` ➜ **Check table schemas**
- `backend/verify_departments.js` ➜ **Verify staff departments**

**Utility Scripts:**
- `backend/scripts/generate_jwt.js` ➜ **Generate JWT secrets**

### Backend - Core Files
Keep all of these:
- `backend/src/` ➜ **All application code**
- `backend/migrations/` ➜ **Database migrations**
- `backend/.env.example` ➜ **Environment template**
- `backend/package.json` ➜ **Dependencies**
- `backend/nodemon.json` ➜ **Dev server config**
- `backend/SETUP_INSTRUCTIONS.md` ➜ **New setup guide**

---

## 📋 Team Setup Instructions

After pulling the code, your team should:

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials
node run_migrations.js
node create_superadmin.js admin@umat.edu.gh password123 Admin User
npm run dev
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```

---

## 🗑️ Quick Cleanup Commands

### Delete All Debug Markdown Files (Root)
```bash
# Windows
del ANALYTICS_*.md EXAMS_*.md FINAL_*.md FULL_*.md QUICK_*.md RESTART_*.md STUDENT_*.md SYSTEM_*.md

# Unix/Linux/macOS
rm ANALYTICS_*.md EXAMS_*.md FINAL_*.md FULL_*.md QUICK_*.md RESTART_*.md STUDENT_*.md SYSTEM_*.md
```

### Delete Debug Scripts (Backend)
```bash
cd backend

# Windows
del add_missing_departments.js check_mechanical_eng.js debug_perry_students.js fix_prof_perry.js test_*.js update_academic_year.js update_user_departments.js check_departments.sql fix_programme_names.sql verify_student_data.sql

# Unix/Linux/macOS
rm add_missing_departments.js check_mechanical_eng.js debug_perry_students.js fix_prof_perry.js test_*.js update_academic_year.js update_user_departments.js *.sql
```

---

## ✨ Final File Structure

After cleanup, your backend should look like:

```
backend/
├── migrations/
│   └── 001_ensure_departments.sql
├── scripts/
│   └── generate_jwt.js
├── src/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   └── server.js
├── uploads/
├── .env.example
├── .gitignore
├── check_db.js ✓ Keep for verification
├── check_students.js ✓ Keep for verification
├── check_table_structure.js ✓ Keep for verification
├── create_superadmin.js ✓ Keep - needed for first admin
├── nodemon.json
├── package.json
├── package-lock.json
├── README.md
├── run_migrations.js ✓ Keep - team must run this
├── SETUP_INSTRUCTIONS.md ✓ New - team setup guide
└── verify_departments.js ✓ Keep for verification
```

---

## 🎯 Summary

**DELETE:** 12 markdown files + 16 debug scripts/SQL files = 28 files total

**KEEP:** 7 verification/setup scripts that your team needs

**NEW:** 3 files created (migration SQL, run_migrations.js, SETUP_INSTRUCTIONS.md)
