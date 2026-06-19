# UPASS Deployment Preparation Summary

## ✅ What Was Fixed

### 1. Department Management
- **Frontend**: Already fetches departments dynamically from `/api/departments` endpoint
- **Backend**: Converts department names to IDs correctly in `authController.js`
- **Issue**: Departments might be missing in new database instances

### 2. Created Migration System
- **New File**: `backend/migrations/001_ensure_departments.sql` - Idempotent SQL migration
- **New File**: `backend/run_migrations.js` - Automated migration runner
- **Purpose**: Ensures all 10 required departments exist in any database instance

### 3. Created Setup Documentation
- **New File**: `backend/SETUP_INSTRUCTIONS.md` - Step-by-step backend setup guide
- **New File**: `CLEANUP_GUIDE.md` - Comprehensive file cleanup instructions

---

## 🎯 What Your Team Must Do

### Step 1: Pull Code from Git
```bash
git pull origin main
```

### Step 2: Backend Setup
```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations (populates departments)
node run_migrations.js

# Create first super admin
node create_superadmin.js admin@umat.edu.gh SecurePass123 Admin User

# Start backend
npm run dev
```

### Step 3: Frontend Setup
```bash
# In project root
npm install
npm run dev
```

### Step 4: Verify Setup
```bash
cd backend
node check_db.js           # Check database health
node verify_departments.js # Verify staff departments
```

---

## 🗂️ Required Departments (Auto-Created by Migration)

The migration automatically creates these 10 departments:

1. Computer Science
2. Electrical Engineering
3. Environmental and Safety Engineering
4. Finance Office
5. Geomatic Engineering
6. Mathematical Sciences
7. Mechanical Engineering
8. Mining Engineering
9. Petroleum Engineering
10. School of Postgraduate Studies

---

## 🧹 Optional: Clean Up Development Files

See `CLEANUP_GUIDE.md` for detailed instructions.

**Quick cleanup (28 files total):**

### Root Directory (12 markdown files)
```bash
# Windows
del ANALYTICS_*.md EXAMS_*.md FINAL_*.md FULL_*.md QUICK_*.md RESTART_*.md STUDENT_*.md SYSTEM_*.md

# Unix/Linux/macOS
rm ANALYTICS_*.md EXAMS_*.md FINAL_*.md FULL_*.md QUICK_*.md RESTART_*.md STUDENT_*.md SYSTEM_*.md
```

### Backend Directory (16 debug files)
```bash
cd backend

# Windows
del add_missing_departments.js check_mechanical_eng.js debug_perry_students.js fix_prof_perry.js test_*.js update_academic_year.js update_user_departments.js check_departments.sql fix_programme_names.sql verify_student_data.sql

# Unix/Linux/macOS
rm add_missing_departments.js check_mechanical_eng.js debug_perry_students.js fix_prof_perry.js test_*.js update_academic_year.js update_user_departments.js *.sql
```

---

## 📋 How Department Dropdown Works

### Frontend (Already Fixed) ✅
`src/pages/admin/ManageUsers.tsx` line 58-62:
```typescript
const [usersData, deptsData] = await Promise.all([
  apiFetch<SystemUser[]>("/users"),
  apiFetch<{ id: number; name: string }[]>("/departments")
]);
setDepartments(deptsData?.map(d => d.name) || []);
```

### Backend (Already Fixed) ✅
`backend/src/controllers/authController.js` line 296-308:
```javascript
// Convert department name to department_id
let department_id = null;
if (department) {
  const deptResult = await db.query(
    "SELECT id FROM departments WHERE LOWER(name) = LOWER($1)",
    [department]
  );
  if (deptResult.rows.length > 0) {
    department_id = deptResult.rows[0].id;
  }
}
```

**The system is fully dynamic!** When superadmin creates a user:
1. Frontend fetches departments from database via API
2. User selects department from populated dropdown
3. Backend converts department name → department_id
4. Department saved correctly to users and supervisors tables

---

## 🔑 Important Notes

### Default Passwords
- **Students**: Index number (e.g., PG1234567)
- **Staff**: Email prefix (e.g., "john" for john@umat.edu.gh)
- All users must change password on first login

### Super Admin Powers
- Create/manage all system users
- Set custom passwords for any user
- Access all departments' data
- Assign department access to staff

### Database Requirements
- PostgreSQL database
- All migrations run automatically via `run_migrations.js`
- Idempotent - safe to run multiple times

---

## 🚨 Troubleshooting

### "Departments not showing in dropdown"
```bash
cd backend
node run_migrations.js
```

### "Database connection error"
Check `backend/.env` has correct `DATABASE_URL`

### "No super admin exists"
```bash
cd backend
node create_superadmin.js admin@umat.edu.gh password FirstName LastName
```

### "Want to verify database"
```bash
cd backend
node check_db.js
```

---

## 📦 Files Created for Deployment

### New Files (Keep These)
- `backend/migrations/001_ensure_departments.sql` - Department migration
- `backend/run_migrations.js` - Migration runner
- `backend/SETUP_INSTRUCTIONS.md` - Backend setup guide
- `CLEANUP_GUIDE.md` - File cleanup guide
- `DEPLOYMENT_SUMMARY.md` - This file

### Existing Files to Keep
- `backend/create_superadmin.js` - Create first admin
- `backend/check_db.js` - Database health check
- `backend/verify_departments.js` - Verify staff departments
- `backend/check_students.js` - Verify student data
- `backend/check_table_structure.js` - Verify table schemas

---

## ✨ Summary

**Status**: ✅ System ready for deployment

**Key Points**:
1. ✅ Frontend already fetches departments dynamically
2. ✅ Backend already converts departments correctly
3. ✅ Migration ensures departments exist in new databases
4. ✅ Team just needs to run migrations after pulling code
5. ✅ Cleanup guide provided for removing 28 debug files

**Next Steps**:
1. Team pulls code from Git
2. Team runs `node run_migrations.js`
3. Team creates super admin
4. System ready to use!
