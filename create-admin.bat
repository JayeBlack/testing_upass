@echo off
echo.
echo ============================================================
echo UPASS - CREATE SUPER ADMIN
echo ============================================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo ERROR: Please run this script from the UPASS project root directory
    pause
    exit /b 1
)

echo This script will create a Super Admin account for UPASS
echo.

REM Prompt for details
set /p email="Enter email address: "
set /p password="Enter password: "
set /p first_name="Enter first name: "
set /p last_name="Enter last name: "

echo.
echo Creating super admin with:
echo Email: %email%
echo Name: %first_name% %last_name%
echo.

cd backend
node create_superadmin.js "%email%" "%password%" "%first_name%" "%last_name%"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create super admin
    pause
    exit /b 1
)

echo.
echo ============================================================
echo SUCCESS!
echo ============================================================
echo.
echo Super admin created successfully!
echo.
echo You can now login with:
echo Email: %email%
echo Password: %password%
echo.
pause
