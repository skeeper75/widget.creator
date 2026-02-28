-- M2: huni_code Contamination Cleanup (SPEC-IM-004)
-- Removes MES code format values from products.huni_code
-- Run AFTER M0 schema migration (ALTER COLUMN huni_code DROP NOT NULL)

UPDATE products SET huni_code = NULL
WHERE huni_code ~ '-'              -- MES code format (contains dash, e.g. "001-0001")
   OR huni_code LIKE 'unknown-%';  -- unknown-* fallback values

-- Verification (run after to confirm)
-- SELECT count(*) FROM products WHERE huni_code IS NULL;        -- > 0 (normal, expected)
-- SELECT count(*) FROM products WHERE huni_code LIKE '%-%';     -- must be 0
-- SELECT count(*) FROM products WHERE huni_code LIKE 'unknown-%'; -- must be 0
