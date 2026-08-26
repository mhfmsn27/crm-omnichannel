-- Increase payment_method length to accommodate longer Xendit channel names
ALTER TABLE transactions
ALTER COLUMN payment_method TYPE VARCHAR(255);