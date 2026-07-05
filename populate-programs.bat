@echo off
echo.
echo ============================================================
echo POPULATE PROGRAMS
echo ============================================================
echo.
echo This script populates the programs table with MSc/MPhil/PhD
echo programs for all departments.
echo.
echo IMPORTANT: This is REQUIRED before bulk student upload!
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the UPASS project root directory
    pause
    exit /b 1
)

echo Running populate_programs.js...
echo.
node backend/populate_programs.js

if errorlevel 1 (
    echo.
    echo ============================================================
    echo ERROR: Program population failed
    echo ============================================================
    echo.
    echo Common issues:
    echo   1. Database connection failed - Check DATABASE_URL in backend/.env
    echo   2. Departments not populated - Run: node backend/run_migrations.js
    echo   3. PostgreSQL not running
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS!
echo ============================================================
echo.
echo Programs have been populated.
echo You can now:
echo   1. Bulk upload students (Admin ^> Manage Students ^> Bulk Upload)
echo   2. Single enroll students with department-specific program dropdown
echo   3. View analytics with program distribution data
echo.
pause
