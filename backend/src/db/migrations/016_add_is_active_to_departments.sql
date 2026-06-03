-- ============================================================
-- 016: Add is_active column to departments table
-- ============================================================

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
