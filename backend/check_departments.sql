-- ============================================
-- Department Persistence Verification Script
-- ============================================

-- 1. Check all departments in the system
SELECT 
    '=== DEPARTMENTS TABLE ===' as info;
SELECT id, name, is_active, created_at 
FROM departments 
ORDER BY name;

-- 2. Check all non-student users with their departments
SELECT 
    '=== ALL USERS WITH DEPARTMENTS ===' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.department_id,
    d.name as department_name,
    u.is_active,
    u.created_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.role != 'Student'
ORDER BY u.created_at DESC;

-- 3. Check users WITHOUT department (should be empty after fix)
SELECT 
    '=== USERS WITHOUT DEPARTMENT ===' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.created_at
FROM users u
WHERE u.department_id IS NULL 
  AND u.role != 'Student'
ORDER BY u.created_at DESC;

-- 4. Check supervisors table with departments
SELECT 
    '=== SUPERVISORS WITH DEPARTMENTS ===' as info;
SELECT 
    s.id,
    s.user_id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    s.staff_id,
    s.title,
    s.specialization,
    s.department_id as supervisor_dept_id,
    d.name as department_name,
    u.department_id as user_dept_id,
    s.created_at
FROM supervisors s
JOIN users u ON s.user_id = u.id
LEFT JOIN departments d ON s.department_id = d.id
ORDER BY s.created_at DESC;

-- 5. Check for mismatches (supervisors where user.department_id != supervisor.department_id)
SELECT 
    '=== DEPARTMENT MISMATCHES (Should be empty) ===' as info;
SELECT 
    s.id as supervisor_id,
    u.id as user_id,
    u.email,
    u.department_id as user_dept,
    s.department_id as supervisor_dept,
    d1.name as user_dept_name,
    d2.name as supervisor_dept_name
FROM supervisors s
JOIN users u ON s.user_id = u.id
LEFT JOIN departments d1 ON u.department_id = d1.id
LEFT JOIN departments d2 ON s.department_id = d2.id
WHERE u.department_id IS DISTINCT FROM s.department_id;

-- 6. Check recently created users (last 10)
SELECT 
    '=== RECENTLY CREATED USERS (Last 10) ===' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.department_id,
    d.name as department_name,
    u.created_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.role != 'Student'
ORDER BY u.created_at DESC
LIMIT 10;
