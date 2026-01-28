/**
 * Check the pepe_listings table schema
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log("Checking pepe_listings table...\n");

  const { data, error } = await supabase
    .from("pepe_listings")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Existing columns:", Object.keys(data[0]));
    console.log("\nSample row:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("Table is empty. Let me try inserting a minimal row...");

    // Try inserting with minimal fields to see what's required
    const { data: insertData, error: insertError } = await supabase
      .from("pepe_listings")
      .insert({
        listing_id: "TEST-001",
        borough: "Manhattan",
        neighborhood: "Test",
        bedrooms: 1,
        bathrooms: 1,
        monthly_rent_usd: 3000,
        status: "Active",
      })
      .select();

    if (insertError) {
      console.log("Insert error:", insertError.message);
    } else {
      console.log("Insert succeeded. Columns:", Object.keys(insertData[0]));
      // Clean up test
      await supabase.from("pepe_listings").delete().eq("listing_id", "TEST-001");
    }
  }
}

checkSchema().catch(console.error);
