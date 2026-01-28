-- ============================================
-- PEPE 2.0 - COMPLETE DATABASE MIGRATION
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sjlcecjluuyrqwznwkcg/sql
--
-- This script:
-- 1. Drops old tables with typos (pepe_listings, listings)
-- 2. Creates a clean 'listings' table with correct column names
-- 3. Seeds sample NYC rental data for testing
-- ============================================

-- ============================================
-- PHASE 1: DROP OLD TABLES
-- ============================================

DROP TABLE IF EXISTS pepe_listings CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- ============================================
-- PHASE 2: CREATE CLEAN TABLE
-- ============================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  address TEXT NOT NULL,
  borough TEXT NOT NULL CHECK (borough IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  neighborhood TEXT,

  -- Pricing (stored as number, not string)
  price NUMERIC NOT NULL CHECK (price > 0),

  -- Unit details
  bedrooms NUMERIC NOT NULL DEFAULT 0,
  bathrooms NUMERIC NOT NULL DEFAULT 1,

  -- Pet policy (standardized values)
  pets TEXT NOT NULL DEFAULT 'Unknown' CHECK (pets IN ('Cats & dogs allowed', 'Cats allowed', 'Dogs allowed', 'No pets', 'Case by case', 'Unknown')),

  -- Media & links
  image_url TEXT,
  original_url TEXT,

  -- Metadata
  description TEXT,
  vibe_keywords TEXT[], -- Emotional keywords: light, quiet, charm, cozy, etc.
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Rented')),
  source TEXT, -- 'streeteasy', 'zillow', 'manual'
  freshness_score INTEGER DEFAULT 50, -- 0-100, higher = more fresh
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHASE 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_listings_borough ON listings(borough);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_bedrooms ON listings(bedrooms);
CREATE INDEX idx_listings_freshness ON listings(freshness_score DESC);

-- ============================================
-- PHASE 4: DISABLE RLS FOR PUBLIC ACCESS
-- ============================================

ALTER TABLE listings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 5: INSERT SAMPLE DATA
-- ============================================

INSERT INTO listings (address, borough, neighborhood, price, bedrooms, bathrooms, pets, image_url, original_url, description, vibe_keywords, freshness_score, source, status)
VALUES
  (
    '123 East 4th Street, Apt 2B',
    'Manhattan',
    'East Village',
    2800,
    1,
    1,
    'Cats & dogs allowed',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://streeteasy.com/example-1',
    'Charming pre-war one bedroom with exposed brick and hardwood floors. Natural light floods through oversized windows. Quiet tree-lined block.',
    ARRAY['charming', 'exposed brick', 'hardwood', 'natural light', 'quiet', 'tree-lined', 'pre-war'],
    85,
    'manual',
    'Active'
  ),
  (
    '456 Bergen Street, Unit 3',
    'Brooklyn',
    'Park Slope',
    3200,
    2,
    1,
    'Cats & dogs allowed',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://streeteasy.com/example-2',
    'Spacious two bedroom with modern renovations. Open layout with high ceilings. Close to Prospect Park. Laundry in building.',
    ARRAY['spacious', 'modern', 'renovated', 'open layout', 'high ceilings'],
    92,
    'manual',
    'Active'
  ),
  (
    '789 Steinway Street, Apt 4F',
    'Queens',
    'Astoria',
    2400,
    1,
    1,
    'Cats allowed',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://streeteasy.com/example-3',
    'Bright one bedroom near the N/W trains. Sunny southern exposure with views. Doorman building with rooftop access.',
    ARRAY['bright', 'sunny', 'views', 'doorman', 'rooftop'],
    78,
    'manual',
    'Active'
  ),
  (
    '321 Grand Concourse, Unit 12A',
    'Bronx',
    'Concourse',
    1900,
    2,
    1,
    'No pets',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    'https://streeteasy.com/example-4',
    'Affordable two bedroom in an Art Deco building. High ceilings with original details. Hardwood floors throughout.',
    ARRAY['high ceilings', 'original details', 'hardwood'],
    65,
    'manual',
    'Active'
  ),
  (
    '555 Waverly Place, Garden Apt',
    'Manhattan',
    'West Village',
    3800,
    0,
    1,
    'Case by case',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    'https://streeteasy.com/example-5',
    'Cozy studio with private garden access. Peaceful retreat on a quiet block. Windowed kitchen and exposed brick.',
    ARRAY['cozy', 'garden', 'peaceful', 'quiet', 'windowed kitchen', 'exposed brick'],
    100,
    'manual',
    'Active'
  ),
  (
    '888 Manhattan Ave, Apt 6R',
    'Brooklyn',
    'Greenpoint',
    2600,
    1,
    1,
    'Cats & dogs allowed',
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
    'https://streeteasy.com/example-6',
    'Modern one bedroom with dishwasher and central air. Bright corner unit. Near waterfront parks.',
    ARRAY['modern', 'bright', 'dishwasher', 'central air', 'waterfront'],
    88,
    'manual',
    'Active'
  ),
  (
    '200 Claremont Ave, Apt 8B',
    'Manhattan',
    'Morningside Heights',
    2200,
    1,
    1,
    'Cats allowed',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://streeteasy.com/example-7',
    'Classic pre-war charm near Columbia. Quiet residential area with tree-lined streets. Courtyard views.',
    ARRAY['pre-war', 'charm', 'quiet', 'tree-lined', 'courtyard'],
    72,
    'manual',
    'Active'
  ),
  (
    '45 Court Street, Unit 2F',
    'Brooklyn',
    'Brooklyn Heights',
    4200,
    2,
    2,
    'Cats & dogs allowed',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',
    'https://streeteasy.com/example-8',
    'Spacious two bed two bath with laundry in unit. Doorman building. Manhattan views from living room.',
    ARRAY['spacious', 'laundry in unit', 'doorman', 'views'],
    95,
    'manual',
    'Active'
  );

-- ============================================
-- PHASE 6: VERIFY
-- ============================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

-- Count inserted rows
SELECT COUNT(*) as total_listings FROM listings;
SELECT borough, COUNT(*) as count FROM listings GROUP BY borough ORDER BY count DESC;
