-- PEPE 2.0 - Schema Fix Migration
-- Run this in Supabase SQL Editor

-- Step 1: Fix column typos (if they exist)
-- Note: These will error if columns don't exist with those names - that's OK

-- Fix bedroom typo
ALTER TABLE pepe_listings RENAME COLUMN bedroomx TO bedrooms;

-- Fix price typo
ALTER TABLE pepe_listings RENAME COLUMN monthly_rwnt_usd TO monthly_rent_usd;

-- Step 2: Rename table to cleaner name
ALTER TABLE pepe_listings RENAME TO listings;

-- Step 3: Disable RLS to allow public reads
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify the schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;
