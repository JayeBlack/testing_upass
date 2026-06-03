-- ============================================================
-- 017: Increase academic_year column length
-- ============================================================

ALTER TABLE fee_records 
ALTER COLUMN academic_year TYPE VARCHAR(50);
