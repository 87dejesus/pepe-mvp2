/**
 * PEPE 2.0 - Import Script
 * Run: npx tsx scripts/import-real-data.ts
 *
 * IMPORTANT: Run the SQL migration first to rename table to 'listings'
 * and fix column names (bedrooms, price)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_PATH = "C:/Users/Luciano/Downloads/Pepe_Rental_Listings_Updated 2.csv";

const VALID_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

function cleanPrice(priceStr: string): number {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[$,\s]/g, ""), 10) || 0;
}

function normalizeBorough(borough: string): string {
  const trimmed = borough?.trim();
  const match = VALID_BOROUGHS.find(b => b.toLowerCase() === trimmed?.toLowerCase());
  return match || trimmed || "Unknown";
}

function normalizePets(petsStr: string | undefined): string {
  if (!petsStr) return "Case by case";
  const lower = petsStr.toLowerCase().trim();

  if (lower === "no" || lower === "none" || lower.includes("no pets")) return "No pets";
  if (lower === "allowed" || lower === "yes" || lower === "pets allowed") return "Cats and dogs allowed";
  if (lower.includes("case by case")) return "Case by case";
  if (lower.includes("cats and dogs")) return "Cats and dogs allowed";

  return "Case by case";
}

interface CSVRow {
  listing_id: string;
  city: string;
  borough: string;
  neighborhood: string;
  building_name: string;
  street_or_area: string;
  bedrooms: string;
  bathrooms: string;
  monthly_rent_usd: string;
  deal_incentive: string;
  broker_fee: string;
  building_type: string;
  constraints: string;
  commute_note: string;
  pressure_signals: string;
  primary_image_url: string;
  apply_url: string;
  curation_note: string;
  status: string;
  last_checked_date: string;
  pets: string;
  laundry: string;
  elevator: string;
}

async function importData() {
  console.log("=".repeat(60));
  console.log("PEPE 2.0 - Import to LISTINGS table");
  console.log("=".repeat(60));
  console.log();

  // Read CSV
  console.log("Reading CSV...");
  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, "utf-8");
  } catch (err) {
    console.error("Failed to read CSV:", err);
    return;
  }

  // Parse
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  console.log(`Found ${records.length} rows\n`);

  // Transform
  const listings = records.map((row) => ({
    listing_id: row.listing_id?.trim(),
    city: row.city?.trim() || "NYC",
    borough: normalizeBorough(row.borough),
    neighborhood: row.neighborhood?.trim() || "Unknown",
    building_name: row.building_name?.trim() || null,
    street_or_area: row.street_or_area?.trim() || null,
    bedrooms: parseInt(row.bedrooms, 10) || 0,
    bathrooms: parseFloat(row.bathrooms) || 1,
    monthly_rent_usd: cleanPrice(row.monthly_rent_usd),
    deal_incentive: row.deal_incentive?.trim() || null,
    broker_fee: row.broker_fee?.trim() || null,
    building_type: row.building_type?.trim() || null,
    constraints: row.constraints?.trim() || null,
    commute_note: row.commute_note?.trim() || null,
    pressure_signals: row.pressure_signals?.trim() || null,
    primary_image_url: row.primary_image_url?.trim()?.split("\n")[0] || null,
    apply_url: row.apply_url?.trim() || null,
    curation_note: row.curation_note?.trim() || null,
    status: row.status?.trim() || "Active",
    last_checked_date: row.last_checked_date?.trim() || new Date().toISOString().split("T")[0],
    pets: normalizePets(row.pets),
    laundry: row.laundry?.trim() || null,
    elevator: row.elevator?.toLowerCase() === "yes" ? "Yes" : row.elevator?.toLowerCase() === "no" ? "No" : null,
  }));

  const validListings = listings.filter(l => l.borough !== "Unknown" && l.monthly_rent_usd > 0);
  console.log(`Valid listings: ${validListings.length}\n`);

  // Summary
  const boroughCounts: Record<string, number> = {};
  const petsCounts: Record<string, number> = {};
  validListings.forEach(l => {
    boroughCounts[l.borough] = (boroughCounts[l.borough] || 0) + 1;
    petsCounts[l.pets] = (petsCounts[l.pets] || 0) + 1;
  });
  console.log("Boroughs:", boroughCounts);
  console.log("Pets:", petsCounts);
  console.log();

  // Clear and insert into LISTINGS table
  console.log("Clearing listings table...");
  const { error: deleteError } = await supabase
    .from("pepe_listings")
    .delete()
    .neq("listing_id", "___never___");

  if (deleteError) {
    console.error("Delete failed:", deleteError.message);
    console.log("\nDid you run the SQL migration to rename the table?");
    console.log("Run this SQL in Supabase:\n");
    console.log("  ALTER TABLE pepe_listings RENAME TO listings;");
    console.log("  ALTER TABLE listings RENAME COLUMN monthly_rent_usd TO price;");
    return;
  }

  console.log("Inserting new data...");
  const { data, error: insertError } = await supabase
    .from("pepe_listings")
    .insert(validListings)
    .select("listing_id");

  if (insertError) {
    console.error("Insert failed:", insertError.message);
    return;
  }

  console.log(`Inserted ${data?.length} rows\n`);

  // Verify
  const { count } = await supabase
    .from("pepe_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  console.log("=".repeat(60));
  console.log(`SUCCESS! ${count} active listings in database.`);
  console.log("=".repeat(60));
}

importData().catch(console.error);
