-- ============================================================
-- Migration: Ensure All Departments Exist
-- Description: Inserts all required departments if they don't exist
-- This is idempotent - safe to run multiple times
-- ============================================================

BEGIN;

-- Insert departments only if they don't already exist
INSERT INTO departments (name, is_active)
SELECT 'Computer Science', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Computer Science'));

INSERT INTO departments (name, is_active)
SELECT 'Electrical Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Electrical Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'Environmental and Safety Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Environmental and Safety Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'Finance Office', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Finance Office'));

INSERT INTO departments (name, is_active)
SELECT 'Geomatic Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Geomatic Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'Mathematical Sciences', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Mathematical Sciences'));

INSERT INTO departments (name, is_active)
SELECT 'Mechanical Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Mechanical Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'Mining Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Mining Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'Petroleum Engineering', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('Petroleum Engineering'));

INSERT INTO departments (name, is_active)
SELECT 'School of Postgraduate Studies', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE LOWER(name) = LOWER('School of Postgraduate Studies'));

COMMIT;

-- Verification: List all departments
SELECT id, name, is_active, created_at
FROM departments
ORDER BY name;
