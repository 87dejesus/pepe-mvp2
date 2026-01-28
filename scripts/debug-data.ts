/**
 * Debug script - dump data and check what's in the database
 * Run: npx tsx scripts/debug-data.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  console.log("=".repeat(60));
  console.log("DEBUG: Supabase Data Dump");
  console.log("=".repeat(60));
  console.log();

  // 1. Check total count
  const { count, error: countError } = await supabase
    .from("pepe_listings")
    .select("*", { count: "exact", head: true });

  console.log(`Total rows in table: ${count}`);
  if (countError) console.log("Count error:", countError.message);
  console.log();

  // 2. Check active count
  const { count: activeCount } = await supabase
    .from("pepe_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  console.log(`Active rows: ${activeCount}`);
  console.log();

  // 3. Dump first 3 rows with key fields
  console.log("First 3 listings (key fields):");
  console.log("-".repeat(60));

  const { data: sample, error: sampleError } = await supabase
    .from("pepe_listings")
    .select("listing_id, borough, neighborhood, monthly_rent_usd, bedrooms, bathrooms, pets, status")
    .limit(3);

  if (sampleError) {
    console.log("Sample error:", sampleError.message);
  } else {
    sample?.forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log(`  listing_id: "${row.listing_id}"`);
      console.log(`  borough: "${row.borough}" (type: ${typeof row.borough})`);
      console.log(`  neighborhood: "${row.neighborhood}"`);
      console.log(`  monthly_rent_usd: ${row.monthly_rent_usd} (type: ${typeof row.monthly_rent_usd})`);
      console.log(`  bedrooms: ${row.bedrooms} (type: ${typeof row.bedrooms})`);
      console.log(`  bathrooms: ${row.bathrooms} (type: ${typeof row.bathrooms})`);
      console.log(`  pets: "${row.pets}"`);
      console.log(`  status: "${row.status}"`);
    });
  }
  console.log();

  // 4. Check unique boroughs
  console.log("Unique boroughs in database:");
  const { data: boroughs } = await supabase
    .from("pepe_listings")
    .select("borough")
    .eq("status", "Active");

  const uniqueBoroughs = [...new Set(boroughs?.map((b) => b.borough))];
  uniqueBoroughs.forEach((b) => console.log(`  - "${b}"`));
  console.log();

  // 5. Check unique status values
  console.log("Unique status values:");
  const { data: statuses } = await supabase
    .from("pepe_listings")
    .select("status");

  const uniqueStatuses = [...new Set(statuses?.map((s) => s.status))];
  uniqueStatuses.forEach((s) => console.log(`  - "${s}"`));
  console.log();

  // 6. Test a simple query (no filters except status)
  console.log("Test query (status=Active only):");
  const { data: testData, error: testError } = await supabase
    .from("pepe_listings")
    .select("listing_id, borough, monthly_rent_usd")
    .eq("status", "Active")
    .limit(5);

  if (testError) {
    console.log("  ERROR:", testError.message);
  } else {
    console.log(`  Found ${testData?.length} results`);
    testData?.forEach((r) => console.log(`    - ${r.listing_id}: ${r.borough}, $${r.monthly_rent_usd}`));
  }
  console.log();

  // 7. Test with borough filter (Manhattan)
  console.log("Test query (status=Active, borough IN ['Manhattan']):");
  const { data: manhattanData, error: manhattanError } = await supabase
    .from("pepe_listings")
    .select("listing_id, borough, monthly_rent_usd")
    .eq("status", "Active")
    .in("borough", ["Manhattan"])
    .limit(5);

  if (manhattanError) {
    console.log("  ERROR:", manhattanError.message);
  } else {
    console.log(`  Found ${manhattanData?.length} results`);
    manhattanData?.forEach((r) => console.log(`    - ${r.listing_id}: ${r.borough}, $${r.monthly_rent_usd}`));
  }
  console.log();

  // 8. Test with price filter
  console.log("Test query (status=Active, price <= 5000):");
  const { data: priceData, error: priceError } = await supabase
    .from("pepe_listings")
    .select("listing_id, borough, monthly_rent_usd")
    .eq("status", "Active")
    .lte("monthly_rent_usd", 5000)
    .limit(5);

  if (priceError) {
    console.log("  ERROR:", priceError.message);
  } else {
    console.log(`  Found ${priceData?.length} results`);
    priceData?.forEach((r) => console.log(`    - ${r.listing_id}: ${r.borough}, $${r.monthly_rent_usd}`));
  }
  console.log();

  // 9. Check RLS policies
  console.log("RLS Check:");
  console.log("  If queries above work, RLS is not blocking reads.");
  console.log("  (Using anon key - same as frontend)");
  console.log();

  console.log("=".repeat(60));
  console.log("DEBUG COMPLETE");
  console.log("=".repeat(60));
}

debug().catch(console.error);
