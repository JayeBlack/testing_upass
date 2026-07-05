@echo off
echo.
echo ============================================================
echo UPASS - CLEAR DATABASE SCHEMA
echo ============================================================
echo.
echo WARNING: This will DROP ALL TABLES and SCHEMA!
echo All data, tables, and structure will be permanently deleted!
echo.
echo Press CTRL+C to cancel, or
pause
echo.

cd backend
node clear_schema.js

if errorlevel 1 (
    echo.
    echo ERROR: Failed to clear schema
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SCHEMA CLEARED!
echo ============================================================
echo.
echo Now run these commands to rebuild:
echo.
echo 1. Import schema:
echo    cd backend
echo    node import_schema.js
echo.
echo 2. Populate departments:
echo    node run_migrations.js
echo.
echo 3. Create super admin:
echo    create-admin.bat
echo.
pause
