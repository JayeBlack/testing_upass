# UMaT Postgraduate Administrative Support System (UPASS)

## Getting Started

### For New Members (After Cloning)

#### 1. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

#### 2. Configure environment variables

```bash
# Copy the example env file and fill in your database credentials
copy backend\.env.example backend\.env
```

Open `backend/.env` and set your PostgreSQL connection string:
```
DATABASE_URL=postgresql://username:password@localhost:5432/umat_postgrad_db
JWT_SECRET=your_secret_key
```

Also create a frontend `.env` file at the project root:
```
VITE_API_URL=http://localhost:5000/api
```

#### 3. Set up the database

Run these commands **in order** from the project root:

```bash
# 1. Create all tables from the schema
node backend/import_schema.js

# 2. Populate departments
node backend/run_migrations.js

# 3. Populate programs (MSc/MPhil/PhD) — REQUIRED before student enrollment
node backend/populate_programs.js

# 4. Populate courses with codes matching the frontend
node backend/populate_courses.js
```

#### 4. Create the superadmin account

> **Note:** Run all `.bat` files from the project root using a cmd terminal.

```bash
create-admin.bat
```

#### 5. Start the development servers

Open **two terminals** from the project root:

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

### For Existing Members

#### Pulled latest changes?

If a teammate has exported a schema update (committed `backend/migrations/schema_export.sql`), re-import it:

```bash
node backend/import_schema.js
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

#### Populating Programs (REQUIRED for Student Enrollment)

```bash
node backend/populate_programs.js
# Or:
populate-programs.bat
```

Must be run before bulk student upload to avoid enrollment errors.

#### Populating Courses

```bash
node backend/populate_courses.js
# Or:
populate-courses.bat
```

Run this whenever new courses are added to `src/data/programmeCourses.ts`.

#### Creating a Superadmin

```bash
create-admin.bat
```

#### Clearing Records Only (keeps tables intact)

```bash
clear-records.bat
```

Deletes all data rows but leaves the table structure. After clearing, re-run:

```bash
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

#### Clearing the Entire Schema (tables + data)

```bash
clear-schema.bat
```

**Warning:** This drops all tables. After clearing, you must re-run the full setup:

```bash
node backend/import_schema.js
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

#### Setting Up Exams Officer

```bash
setup-exams-officer.bat
```

#### Checking Analytics Data

```bash
node backend/check_analytics_data.js
```

Verifies analytics will display properly for all users (especially ExamsOfficer). Shows:
- Student count
- Department/Program count
- Enrollment distribution
- Grade data availability
- CWA distribution

#### Checking CWA & Pass List Data

```bash
node backend/check_grades_cwa.js
# Or:
check-cwa-passlist.bat
```

Verifies CWA calculation and pass list generation. Shows:
- Grade records count
- Students with grades
- CWA distribution by range
- Top students by CWA
- Graduands status
- Data integrity checks

#### Updating Schema Export (For Team Sharing)

After making database changes, export and commit the updated schema:

```bash
node backend/export_schema.js
git add backend/migrations/schema_export.sql
git commit -m "Update database schema"
```

---

## Sample Data Files

The repository includes sample files for testing bulk uploads and features.

### Bulk Upload Samples (in `backend/excel-files/`)

| File | Purpose |
|------|---------|
| `sample_bulk_users.xlsx` | Bulk upload users (supervisors, accountants, etc.) |
| `sample_bulk_students.xlsx` | Bulk upload student records (300 students) |
| `sample_bulk_payments.xlsx` | Bulk upload **NEW fee records** — 300 students with realistic payment scenarios:<br>• 40% Paid in full<br>• 35% Partial payments (owing fees)<br>• 20% Unpaid<br>• 5% Overpaid (credit balance)<br>All via Bank Transfer with varied semesters and academic years. |
| `sample_payment_updates.xlsx` | Payment updates for **2 students who owe fees** from bulk upload:<br>• Student 1: Overpayment → Creates GHS 1000 credit balance<br>• Student 2: Exact remainder payment → Clears fee completely |
| `sample_fee_schedule.xlsx` | Sample fee schedule for testing import/notification workflows — columns: **Programme**, **Level**, **Amount** |
| `results_computer_science_sem1.xlsx` | Test results upload — Computer Science MSc Semester 1 grades |
| `results_computer_science_sem2.xlsx` | Test results upload — Computer Science MSc Semester 2 grades |
| `results_electrical_engineering_sem1.xlsx` | Test results upload — Electrical Engineering MSc Semester 1 grades |
| `results_electrical_engineering_sem2.xlsx` | Test results upload — Electrical Engineering MSc Semester 2 grades |

### Regenerating Sample Files

```bash
cd backend/Might_Need

node generate_bulk_users.js
node generate_bulk_students.js
node generate_bulk_payments.js
node generate_payment_updates.js

node generate_cs_sem1_results.js
node generate_cs_sem2_results.js
node generate_eee_sem1_results.js
node generate_eee_sem2_results.js

node generate_fee_schedule.js
```

> **Note:** Close Excel files before regenerating to avoid file locks.

---

## Project Structure

```
UPASS/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   ├── db/                 # Database connection
│   │   ├── middleware/         # Auth, validation, etc.
│   │   └── routes/             # API route definitions
│   ├── migrations/             # Database schema files
│   │   └── schema_export.sql   # ⭐ SOURCE OF TRUTH - Complete database schema
│   ├── scripts/                # Utility/maintenance scripts
│   ├── excel-files/            # Sample bulk upload files
│   ├── Might_Need/             # Generator scripts for sample files
│   ├── uploads/                # Uploaded files (gitignored)
│   ├── import_schema.js        # Import schema into database
│   ├── export_schema.js        # Export current database schema
│   ├── run_migrations.js       # Populate departments table
│   ├── populate_programs.js    # Populate programs (MSc/MPhil/PhD)
│   ├── populate_courses.js     # Populate courses with frontend-matching codes
│   ├── check_analytics_data.js # Verify analytics data availability
│   ├── check_grades_cwa.js     # Verify CWA calculation and pass list data
│   ├── .env.example            # Environment variable template
│   └── .env                    # Your local config (gitignored)
├── src/                        # React frontend (Vite + TypeScript)
│   ├── pages/                  # Page components by role
│   ├── components/             # Reusable UI components
│   ├── contexts/               # React context providers
│   ├── hooks/                  # Custom hooks
│   ├── data/                   # Static data (course catalog, etc.)
│   └── lib/                    # Utilities (export, API client)
├── supabase/                   # Supabase config (not actively used)
├── create-admin.bat            # Create superadmin user
├── clear-records.bat           # Delete all data rows (keeps tables)
├── clear-schema.bat            # Drop all tables (full wipe)
├── populate-programs.bat       # Populate programs table
├── populate-courses.bat        # Populate courses table
├── setup-exams-officer.bat     # Set up Exams Officer role
├── check-cwa-passlist.bat      # Verify CWA and pass list data
└── README.md                   # This file
```

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + PostgreSQL
- **Auth:** JWT-based authentication with role-based access control
- **PDF Export:** jsPDF with custom table rendering

---

## Available Roles

| Role | Capabilities |
|------|-------------|
| **Student** | Submit thesis, view results, track fees, request documents, apply for clearance |
| **Supervisor** | Review thesis submissions, approve/reject thesis clearance steps |
| **Accountant** | Manage fees, generate financial reports |
| **Admin** | Manage users, students, courses, departments |
| **Dean / ViceDean** | Approve clearances, view CWA results, analytics |
| **Registrar** | Manage results, pass lists, exam timetables |
| **Exams Officer** | Publish results, generate pass lists, view read-only analytics |
| **Admin Assistant** | Support admin operations |

---

## Key Features

- Mandatory first-login password reset for all users
- Thesis submission & supervisor review workflow
- Fee management with bulk upload (CSV/Excel)
- Multi-step student clearance with role-targeted approvals
- CWA (Cumulative Weighted Average) results & analytics
- Real-time analytics for Admin, Dean, ViceDean, and ExamsOfficer
- Document request management
- Financial report exports (CSV & PDF)
- AI assistant for supervisor feedback
- Real-time notifications for all roles

---

## Analytics & Reporting

### ExamsOfficer Analytics Access

ExamsOfficer users have **read-only** access to comprehensive analytics:

- Enrollment trends (historical growth)
- Enrollment by department (with gender breakdown)
- Fees collection trends
- Graduation eligibility (eligible vs ineligible)
- CWA distribution (grade ranges)
- Program distribution (students per program)
- Thesis progress tracking
- System alerts and notices

**Prerequisites for Analytics:**
1. **Departments populated** — `node backend/run_migrations.js`
2. **Programs populated** — `node backend/populate_programs.js`
3. **Students enrolled** — Upload via Admin > Manage Students > Bulk Upload
4. **Grades uploaded** — Upload via Exams Officer > Grade Entry

**Verify Analytics Data:**
```bash
node backend/check_analytics_data.js
```

---

## Database Management

### Schema as Source of Truth

This project uses **`backend/migrations/schema_export.sql`** as the single source of truth for database structure.

> **⚠️ Note:** The `backend/src/db/migrations/` folder contains legacy migration files that are **redundant**. Do not use `backend/src/db/migrate.js`. Use the import/export schema approach instead.

### Course Code Synchronization

Course codes in the database **must** match the codes in `src/data/programmeCourses.ts`. The `populate_courses.js` script handles this by inserting courses from the frontend catalog with exact code matching (e.g., `PE 500`, `CE 571`, `GM 555`).

If you add new courses to the frontend catalog, run:
```bash
node backend/populate_courses.js
```

### Common Workflows

**New team member — full setup:**
```bash
node backend/import_schema.js
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

**Teammate exported a schema change:**
```bash
node backend/import_schema.js
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

**You made database changes — share with team:**
```bash
node backend/export_schema.js
git add backend/migrations/schema_export.sql
git commit -m "Update database schema"
```

**Full wipe and rebuild:**
```bash
clear-schema.bat
node backend/import_schema.js
node backend/run_migrations.js
node backend/populate_programs.js
node backend/populate_courses.js
```

---

## License

Internal use — University of Mines and Technology, School of Postgraduate Studies — Tarkwa.
