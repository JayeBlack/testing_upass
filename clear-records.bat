@echo off
echo.
echo ============================================================
echo UPASS - CLEAR ALL RECORDS
echo ============================================================
echo.
echo WARNING: This will delete ALL DATA but keep table structure!
echo.
echo Press CTRL+C to cancel, or
pause
echo.

cd backend
node clear_records.js

if errorlevel 1 (
    echo.
    echo ERROR: Failed to clear database
    pause
    exit /b 1
)

echo.
echo ============================================================
echo ALL RECORDS CLEARED!
echo ============================================================
echo.
echo Tables still exist. You may need to:
echo.
echo 1. Repopulate departments:
echo    cd backend
echo    node run_migrations.js
echo.
echo 2. Create super admin:
echo    create-admin.bat
echo    OR: cd backend ^&^& node create_superadmin.js admin@test.com pass123 Admin User
echo.
pause
