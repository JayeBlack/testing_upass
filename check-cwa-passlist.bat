@echo off
echo.
echo ============================================================
echo CWA & PASS LIST DIAGNOSTIC
echo ============================================================
echo.
echo This script verifies that CWA distribution and pass list
echo generation are working correctly.
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the UPASS project root directory
    pause
    exit /b 1
)

echo Running diagnostic...
echo.
node backend/check_grades_cwa.js

if errorlevel 1 (
    echo.
    echo ============================================================
    echo DIAGNOSTIC FAILED
    echo ============================================================
    echo.
    echo Common issues:
    echo   1. Database connection failed
    echo   2. No grades uploaded
    echo   3. PostgreSQL not running
    echo.
    echo To fix:
    echo   - Upload grades via Exams Officer ^> Grade Entry
    echo   - Use sample files in backend/excel-files/
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo DIAGNOSTIC COMPLETE
echo ============================================================
echo.
echo Next steps:
echo   1. Generate pass list via Exams Officer ^> Pass List
echo   2. View CWA distribution in Analytics
echo   3. Export pass list as CSV/PDF
echo.
pause
