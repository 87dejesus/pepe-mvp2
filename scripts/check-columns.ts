import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  // Try to select from listings
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .limit(1);

  if (error) {
    console.log("Error:", error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns in listings table:");
    console.log(Object.keys(data[0]).join(", "));
    console.log("\nSample row:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("Table exists but is empty. Inserting minimal test row...");

    const { error: insertErr } = await supabase
      .from("listings")
      .insert({
        address: "Test",
        borough: "Manhattan",
        price: 1000,
      });

    if (insertErr) {
      console.log("Insert error:", insertErr.message);
    } else {
      console.log("Insert succeeded!");
    }
  }
}

check();
