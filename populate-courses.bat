@echo off
echo ============================================================
echo POPULATING COURSES
echo ============================================================
echo.
echo This will populate the courses table with course codes
echo that match the frontend catalog data.
echo.
node backend\populate_courses.js
echo.
pause
