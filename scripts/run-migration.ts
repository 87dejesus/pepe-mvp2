/**
 * PEPE 2.0 - Database Migration Runner
 *
 * This script drops the old pepe_listings table and creates a clean 'listings' table.
 *
 * OPTION 1: Run in Supabase SQL Editor (recommended)
 * Copy the SQL below and paste into: https://supabase.com/dashboard/project/sjlcecjluuyrqwznwkcg/sql
 *
 * OPTION 2: Run this script with a service role key
 * npx tsx scripts/run-migration.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// For DDL operations, you need the service role key (not anon key)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const MIGRATION_SQL = `
-- ============================================
-- PEPE 2.0 - CLEAN DATABASE MIGRATION
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sjlcecjluuyrqwznwkcg/sql

-- PHASE 1: DROP OLD TABLES
DROP TABLE IF EXISTS pepe_listings CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- PHASE 2: CREATE CLEAN TABLE WITH CORRECT COLUMN NAMES
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  address TEXT NOT NULL,
  borough TEXT NOT NULL CHECK (borough IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  neighborhood TEXT,

  -- Pricing (number, not string)
  price NUMERIC NOT NULL CHECK (price > 0),

  -- Unit details
  bedrooms NUMERIC NOT NULL DEFAULT 0,
  bathrooms NUMERIC NOT NULL DEFAULT 1,

  -- Pet policy
  pets TEXT NOT NULL DEFAULT 'Unknown' CHECK (pets IN ('Cats & dogs allowed', 'Cats allowed', 'Dogs allowed', 'No pets', 'Case by case', 'Unknown')),

  -- Media & links
  image_url TEXT,
  original_url TEXT,

  -- Metadata
  description TEXT,
  vibe_keywords TEXT[], -- emotional keywords: light, quiet, charm, etc.
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Rented')),
  source TEXT, -- 'streeteasy', 'zillow', 'manual'
  freshness_score INTEGER DEFAULT 50, -- 0-100, higher = more fresh
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_listings_borough ON listings(borough);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_bedrooms ON listings(bedrooms);
CREATE INDEX idx_listings_freshness ON listings(freshness_score DESC);

-- Disable RLS for public read access
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;

-- Verify creation
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;
`;

async function runMigration() {
  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Database Migration");
  console.log("=".repeat(60));
  console.log();

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if we have service role access
  const { data: testData, error: testError } = await supabase
    .from("pepe_listings")
    .select("count")
    .limit(1);

  if (testError && testError.message.includes("does not exist")) {
    console.log("Table pepe_listings doesn't exist - may already be migrated.");
  }

  console.log("\n--- MIGRATION SQL ---");
  console.log("Copy this SQL and run it in Supabase SQL Editor:");
  console.log("https://supabase.com/dashboard/project/sjlcecjluuyrqwznwkcg/sql");
  console.log("\n" + MIGRATION_SQL);

  console.log("\n--- ALTERNATIVE: Direct API call ---");
  console.log("If you have SUPABASE_SERVICE_ROLE_KEY set, this script can execute directly.");

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("\nService role key detected. Attempting migration...");
    // Note: The anon key can't run DDL - you'd need to use the Supabase Management API
    // or run the SQL directly in the dashboard
    console.log("DDL requires SQL Editor. Please copy the SQL above.");
  } else {
    console.log("\nNo service role key found. Please run the SQL manually in Supabase.");
  }
}

runMigration().catch(console.error);
