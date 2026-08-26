-- Increase provider_name length to accommodate longer Xendit channel names
ALTER TABLE payment_channels ALTER COLUMN provider_name TYPE VARCHAR(255);
ALTER TABLE payment_channels ALTER COLUMN account_number TYPE VARCHAR(100);
