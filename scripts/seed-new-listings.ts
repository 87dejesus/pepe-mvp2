/**
 * PEPE 2.0 - Seed New Listings Table
 *
 * Populates the clean 'listings' table with sample NYC rental data.
 * Run after the migration to have data to test with.
 *
 * Run: npx tsx scripts/seed-new-listings.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SAMPLE_LISTINGS = [
  {
    address: "123 East 4th Street, Apt 2B",
    borough: "Manhattan",
    neighborhood: "East Village",
    price: 2800,
    bedrooms: 1,
    bathrooms: 1,
    pets: "Cats & dogs allowed",
    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    original_url: "https://streeteasy.com/example-1",
    description: "Charming pre-war one bedroom with exposed brick and hardwood floors. Natural light floods through oversized windows. Quiet tree-lined block.",
    vibe_keywords: ["charming", "exposed brick", "hardwood", "natural light", "quiet", "tree-lined", "pre-war"],
    freshness_score: 85,
    source: "manual",
  },
  {
    address: "456 Bergen Street, Unit 3",
    borough: "Brooklyn",
    neighborhood: "Park Slope",
    price: 3200,
    bedrooms: 2,
    bathrooms: 1,
    pets: "Cats & dogs allowed",
    image_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    original_url: "https://streeteasy.com/example-2",
    description: "Spacious two bedroom with modern renovations. Open layout with high ceilings. Close to Prospect Park. Laundry in building.",
    vibe_keywords: ["spacious", "modern", "renovated", "open layout", "high ceilings"],
    freshness_score: 92,
    source: "manual",
  },
  {
    address: "789 Steinway Street, Apt 4F",
    borough: "Queens",
    neighborhood: "Astoria",
    price: 2400,
    bedrooms: 1,
    bathrooms: 1,
    pets: "Cats allowed",
    image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    original_url: "https://streeteasy.com/example-3",
    description: "Bright one bedroom near the N/W trains. Sunny southern exposure with views. Doorman building with rooftop access.",
    vibe_keywords: ["bright", "sunny", "views", "doorman", "rooftop"],
    freshness_score: 78,
    source: "manual",
  },
  {
    address: "321 Grand Concourse, Unit 12A",
    borough: "Bronx",
    neighborhood: "Concourse",
    price: 1900,
    bedrooms: 2,
    bathrooms: 1,
    pets: "No pets",
    image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    original_url: "https://streeteasy.com/example-4",
    description: "Affordable two bedroom in an Art Deco building. High ceilings with original details. Hardwood floors throughout.",
    vibe_keywords: ["high ceilings", "original details", "hardwood"],
    freshness_score: 65,
    source: "manual",
  },
  {
    address: "555 Waverly Place, Garden Apt",
    borough: "Manhattan",
    neighborhood: "West Village",
    price: 3800,
    bedrooms: 0,
    bathrooms: 1,
    pets: "Case by case",
    image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    original_url: "https://streeteasy.com/example-5",
    description: "Cozy studio with private garden access. Peaceful retreat on a quiet block. Windowed kitchen and exposed brick.",
    vibe_keywords: ["cozy", "garden", "peaceful", "quiet", "windowed kitchen", "exposed brick"],
    freshness_score: 100,
    source: "manual",
  },
  {
    address: "888 Manhattan Ave, Apt 6R",
    borough: "Brooklyn",
    neighborhood: "Greenpoint",
    price: 2600,
    bedrooms: 1,
    bathrooms: 1,
    pets: "Cats & dogs allowed",
    image_url: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
    original_url: "https://streeteasy.com/example-6",
    description: "Modern one bedroom with dishwasher and central air. Bright corner unit. Near waterfront parks.",
    vibe_keywords: ["modern", "bright", "dishwasher", "central air", "waterfront"],
    freshness_score: 88,
    source: "manual",
  },
  {
    address: "200 Claremont Ave, Apt 8B",
    borough: "Manhattan",
    neighborhood: "Morningside Heights",
    price: 2200,
    bedrooms: 1,
    bathrooms: 1,
    pets: "Cats allowed",
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    original_url: "https://streeteasy.com/example-7",
    description: "Classic pre-war charm near Columbia. Quiet residential area with tree-lined streets. Courtyard views.",
    vibe_keywords: ["pre-war", "charm", "quiet", "tree-lined", "courtyard"],
    freshness_score: 72,
    source: "manual",
  },
  {
    address: "45 Court Street, Unit 2F",
    borough: "Brooklyn",
    neighborhood: "Brooklyn Heights",
    price: 4200,
    bedrooms: 2,
    bathrooms: 2,
    pets: "Cats & dogs allowed",
    image_url: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
    original_url: "https://streeteasy.com/example-8",
    description: "Spacious two bed two bath with laundry in unit. Doorman building. Manhattan views from living room.",
    vibe_keywords: ["spacious", "laundry in unit", "doorman", "views"],
    freshness_score: 95,
    source: "manual",
  },
];

async function seed() {
  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Seeding New Listings Table");
  console.log("=".repeat(60));
  console.log();

  // Check if table exists and has data
  const { data: existing, error: checkError } = await supabase
    .from("listings")
    .select("id")
    .limit(1);

  if (checkError) {
    console.error("Error checking table:", checkError.message);
    console.log("\nMake sure to run the migration SQL first!");
    console.log("See: scripts/run-migration.ts for the SQL");
    return;
  }

  if (existing && existing.length > 0) {
    console.log("Table already has data. Clearing existing records...");
    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.error("Failed to clear table:", deleteError.message);
      return;
    }
  }

  console.log(`Inserting ${SAMPLE_LISTINGS.length} sample listings...`);

  const { data, error } = await supabase
    .from("listings")
    .insert(
      SAMPLE_LISTINGS.map((l) => ({
        ...l,
        status: "Active",
      }))
    )
    .select("id, address, borough, price");

  if (error) {
    console.error("Insert failed:", error.message);
    return;
  }

  console.log("\nInserted listings:");
  data?.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.address} - $${l.price}/mo (${l.borough})`);
  });

  console.log(`\nSuccessfully seeded ${data?.length || 0} listings.`);
  console.log("\nYou can now test the app at http://localhost:3000/decision");
}

seed().catch(console.error);
