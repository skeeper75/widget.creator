-- M1: Post-Process Code Normalization (SPEC-IM-004)
-- Updates existing Postprocess001~008 codes to PP_* semantic codes
-- Run BEFORE re-running import-processes.ts to avoid duplicate key conflicts

UPDATE post_processes SET code = 'PP_PERFORATION'   WHERE code = 'Postprocess001';
UPDATE post_processes SET code = 'PP_CREASING'       WHERE code = 'Postprocess002';
UPDATE post_processes SET code = 'PP_FOLDING'        WHERE code = 'Postprocess003';
UPDATE post_processes SET code = 'PP_VARIABLE_TEXT'  WHERE code = 'Postprocess004';
UPDATE post_processes SET code = 'PP_VARIABLE_IMAGE' WHERE code = 'Postprocess005';
UPDATE post_processes SET code = 'PP_ROUNDED_CORNER' WHERE code = 'Postprocess006';
UPDATE post_processes SET code = 'PP_COATING_A3'     WHERE code = 'Postprocess007';
UPDATE post_processes SET code = 'PP_COATING_T3'     WHERE code = 'Postprocess008';

-- Verification
-- SELECT code, name FROM post_processes ORDER BY display_order;
