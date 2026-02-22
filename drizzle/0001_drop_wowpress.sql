-- Drop WowPress domain tables (no longer in use)
-- These 10 tables belong to the legacy WowPress Print Product Catalog
-- and are being removed as part of SPEC-INFRA-001 Drizzle migration.

DROP TABLE IF EXISTS "PricingTable" CASCADE;
DROP TABLE IF EXISTS "DeliveryInfo" CASCADE;
DROP TABLE IF EXISTS "ProductOrderQty" CASCADE;
DROP TABLE IF EXISTS "ProductPostProcess" CASCADE;
DROP TABLE IF EXISTS "ProductPrintMethod" CASCADE;
DROP TABLE IF EXISTS "ProductColor" CASCADE;
DROP TABLE IF EXISTS "ProductPaper" CASCADE;
DROP TABLE IF EXISTS "ProductSize" CASCADE;
DROP TABLE IF EXISTS "PrintProduct" CASCADE;
DROP TABLE IF EXISTS "ProductCategory" CASCADE;
