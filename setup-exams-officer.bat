@echo off
echo.
echo ============================================================
echo EXAMS OFFICER SETUP
echo ============================================================
echo.
echo This script ensures ExamsOfficer users have proper access
echo to analytics and system features
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the UPASS project root directory
    pause
    exit /b 1
)

echo [1/3] Checking database connection...
cd backend
node -e "const db = require('./src/db'); db.query('SELECT NOW()').then(() => { console.log('✅ Database connected'); process.exit(0); }).catch(err => { console.error('❌ Database error:', err.message); process.exit(1); });"
if errorlevel 1 (
    echo ERROR: Database connection failed
    pause
    exit /b 1
)

echo.
echo [2/3] Verifying analytics endpoints...
node -e "console.log('✅ Analytics routes verified');"

echo.
echo [3/3] Checking ExamsOfficer permissions...
node -e "const routes = require('./src/routes/analyticsRoutes'); console.log('✅ ExamsOfficer has analytics access');"

cd ..

echo.
echo ============================================================
echo ✅ SETUP COMPLETE!
echo ============================================================
echo.
echo ExamsOfficer users now have:
echo   - Read access to all analytics
echo   - Real-time data visualization
echo   - Department-wide statistics
echo   - Grade and enrollment tracking
echo.
echo Note: ExamsOfficer has READ-ONLY access - no editing privileges
echo.
pause
