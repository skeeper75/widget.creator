-- M5: mesRegistered Normalization via DB Trigger (SPEC-IM-004)
-- Option A (Recommended): PostgreSQL trigger keeps mes_registered in sync with product_mes_mapping
-- See architecture.md ADR-004 for rationale

-- Trigger function: updates products.mes_registered when product_mes_mapping changes
CREATE OR REPLACE FUNCTION sync_mes_registered()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET mes_registered = EXISTS(
    SELECT 1 FROM product_mes_mapping
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ) WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fires after INSERT or DELETE on product_mes_mapping
DROP TRIGGER IF EXISTS trg_sync_mes_registered ON product_mes_mapping;
CREATE TRIGGER trg_sync_mes_registered
AFTER INSERT OR DELETE ON product_mes_mapping
FOR EACH ROW EXECUTE FUNCTION sync_mes_registered();

-- Initial synchronization: run after M3 (import-product-mes-mapping.ts) completes
-- Sets mes_registered = true for products with at least one mapping, false otherwise
UPDATE products p
SET mes_registered = EXISTS(
  SELECT 1 FROM product_mes_mapping m WHERE m.product_id = p.id
);

-- Verification
-- SELECT count(*) FROM products WHERE mes_registered = true;  -- should match product_mes_mapping distinct count
-- SELECT count(*) FROM product_mes_mapping;                   -- cross-check
