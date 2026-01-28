/**
 * Import CSV to NEW listings schema
 * Run: npx tsx scripts/import-csv-to-new-schema.ts
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

function cleanPrice(priceStr: string): number {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[$,\s]/g, ""), 10) || 0;
}

function normalizePets(petsStr: string | undefined): string {
  if (!petsStr) return "Unknown";
  const lower = petsStr.toLowerCase().trim();

  if (lower === "no" || lower === "none" || lower.includes("no pets")) return "No pets";
  if (lower === "allowed" || lower === "yes") return "Cats & dogs allowed";
  if (lower.includes("case by case")) return "Case by case";
  if (lower.includes("cats and dogs") || lower.includes("cat") && lower.includes("dog")) return "Cats & dogs allowed";
  if (lower.includes("cat")) return "Cats allowed";
  if (lower.includes("dog")) return "Dogs allowed";

  return "Unknown";
}

async function main() {
  console.log("=".repeat(60));
  console.log("Import CSV to NEW listings schema");
  console.log("=".repeat(60));
  console.log();

  // Read CSV
  console.log("Reading CSV...");
  const csvContent = readFileSync(CSV_PATH, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  console.log(`Found ${records.length} rows\n`);

  // Transform to new schema
  const listings = records.map((row: any) => ({
    address: row.street_or_area || row.building_name || "Unknown",
    borough: row.borough?.trim() || "Manhattan",
    neighborhood: row.neighborhood?.trim() || null,
    price: cleanPrice(row.monthly_rent_usd),
    bedrooms: parseInt(row.bedrooms, 10) || 0,
    bathrooms: parseFloat(row.bathrooms) || 1,
    pets: normalizePets(row.pets),
    image_url: row.primary_image_url?.trim()?.split("\n")[0] || null,
    original_url: row.apply_url?.trim() || null,
    description: row.curation_note?.trim() || null,
    source: "csv",
    status: "Active",
  }));

  const valid = listings.filter((l: any) => l.price > 0);
  console.log(`Valid listings: ${valid.length}\n`);

  // Show sample
  console.log("Sample listing:");
  console.log(JSON.stringify(valid[0], null, 2));
  console.log();

  // Insert
  console.log("Inserting into listings table...");
  const { data, error } = await supabase
    .from("listings")
    .insert(valid)
    .select("id");

  if (error) {
    console.error("Insert failed:", error.message);
    console.log("\nMake sure you ran the SQL migration first!");
    console.log("Run scripts/migration-fresh-start.sql in Supabase SQL Editor");
    return;
  }

  console.log(`Inserted ${data?.length} listings\n`);

  // Verify
  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true });

  console.log("=".repeat(60));
  console.log(`SUCCESS! ${count} listings in database.`);
  console.log("=".repeat(60));
}

main().catch(console.error);
