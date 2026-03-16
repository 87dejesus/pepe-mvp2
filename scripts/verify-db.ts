import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await sb
    .from("listings")
    .select("id, address, borough, price, bedrooms, original_url, status")
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("Latest 12 Active listings (newest first):");
  console.log("-".repeat(80));
  data.forEach((l, i) =>
    console.log(
      `${i + 1}. $${l.price} | ${l.bedrooms}BR | ${l.borough} | ${(l.address || "").slice(0, 55)} | ${l.original_url ? "URL OK" : "NO URL"}`
    )
  );

  const { count } = await sb
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  console.log("-".repeat(80));
  console.log(`Total Active listings: ${count}`);
}

run();
