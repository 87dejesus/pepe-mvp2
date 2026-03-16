/**
 * Remove test listings from database
 * Run: npx tsx scripts/cleanup-test-data.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
  console.log("Removing test listings...\n");

  const { data, error } = await supabase
    .from("pepe_listings")
    .delete()
    .like("listing_id", "NYC-TEST-%")
    .select("listing_id");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Removed ${data?.length || 0} test listings`);

  const { count } = await supabase
    .from("pepe_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  console.log(`Total active listings remaining: ${count}`);
}

cleanup().catch(console.error);
