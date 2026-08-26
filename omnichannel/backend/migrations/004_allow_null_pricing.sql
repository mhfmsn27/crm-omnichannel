-- Allow NULL for pricing columns to support disabling specific billing cycles
ALTER TABLE plans
ALTER COLUMN price_monthly
DROP NOT NULL;

ALTER TABLE plans
ALTER COLUMN price_yearly
DROP NOT NULL;