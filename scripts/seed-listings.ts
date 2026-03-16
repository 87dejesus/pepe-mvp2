/**
 * Seed script to populate pepe_listings table with test data
 * Run: npx tsx scripts/seed-listings.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const mockListings = [
  {
    listing_id: "NYC-TEST-001",
    city: "NYC",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    building_name: "The Westmont",
    street_or_area: "255 W 94th St",
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent_usd: 3500,
    deal_incentive: "1 month free",
    broker_fee: "No",
    building_type: "Pre-war elevator",
    constraints: null,
    commute_note: "2 min walk to 96th St 1/2/3 subway",
    primary_image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    curation_note: "Stunning pre-war 1BR with original hardwood floors, high ceilings, and abundant natural light. Steps from Central Park and express trains. Pet-friendly building with live-in super.",
    pressure_signals: "3 other inquiries this week. Similar units in this building rent within 5 days.",
    apply_url: "https://streeteasy.com",
    pets: "Cats and dogs allowed",
    laundry: "In building",
    elevator: "Yes",
    status: "Active",
    last_checked_date: "2026-01-28",
  },
  {
    listing_id: "NYC-TEST-002",
    city: "NYC",
    borough: "Manhattan",
    neighborhood: "East Village",
    building_name: null,
    street_or_area: "312 E 6th St",
    bedrooms: 0,
    bathrooms: 1,
    monthly_rent_usd: 2800,
    deal_incentive: null,
    broker_fee: "No",
    building_type: "Walk-up",
    constraints: "5th floor walk-up",
    commute_note: "5 min walk to Astor Place 6 train",
    primary_image_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    curation_note: "Charming studio in prime East Village location. Exposed brick, renovated kitchen with dishwasher. Walk to NYU, great restaurants, and nightlife.",
    pressure_signals: "Just listed today. Expect high demand.",
    apply_url: "https://streeteasy.com",
    pets: "No pets",
    laundry: "None",
    elevator: "No",
    status: "Active",
    last_checked_date: "2026-01-28",
  },
  {
    listing_id: "NYC-TEST-003",
    city: "NYC",
    borough: "Brooklyn",
    neighborhood: "Williamsburg",
    building_name: "The Edge",
    street_or_area: "22 N 6th St",
    bedrooms: 2,
    bathrooms: 1,
    monthly_rent_usd: 4200,
    deal_incentive: "2 months free",
    broker_fee: "No",
    building_type: "New construction",
    constraints: null,
    commute_note: "3 min walk to Bedford Ave L train",
    primary_image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    curation_note: "Modern 2BR in new construction building with rooftop access, gym, and bike storage. Open kitchen, floor-to-ceiling windows with Manhattan skyline views.",
    pressure_signals: "5 applications already submitted. Open house this weekend.",
    apply_url: "https://streeteasy.com",
    pets: "Cats allowed",
    laundry: "In unit",
    elevator: "Yes",
    status: "Active",
    last_checked_date: "2026-01-28",
  },
  {
    listing_id: "NYC-TEST-004",
    city: "NYC",
    borough: "Brooklyn",
    neighborhood: "Park Slope",
    building_name: null,
    street_or_area: "421 5th Ave",
    bedrooms: 3,
    bathrooms: 2,
    monthly_rent_usd: 5500,
    deal_incentive: null,
    broker_fee: "Yes (1 month)",
    building_type: "Brownstone",
    constraints: null,
    commute_note: "5 min walk to Union St R train",
    primary_image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    curation_note: "Spacious family-friendly 3BR in classic brownstone. Two full baths, eat-in kitchen, private backyard. Top-rated school district. Near Prospect Park.",
    pressure_signals: "Rare find for families. Owner motivated, flexible on move-in date.",
    apply_url: "https://streeteasy.com",
    pets: "Pets allowed with deposit",
    laundry: "In unit",
    elevator: "No",
    status: "Active",
    last_checked_date: "2026-01-28",
  },
  {
    listing_id: "NYC-TEST-005",
    city: "NYC",
    borough: "Queens",
    neighborhood: "Astoria",
    building_name: "Astoria Tower",
    street_or_area: "31-10 Ditmars Blvd",
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent_usd: 2400,
    deal_incentive: "First month free",
    broker_fee: "No",
    building_type: "Elevator building",
    constraints: null,
    commute_note: "4 min walk to Ditmars Blvd N/W train",
    primary_image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    curation_note: "Bright corner 1BR with balcony in elevator building. Laundry in basement, storage included. Amazing Greek restaurants nearby. Quick commute to Midtown.",
    pressure_signals: "Below market rate. Landlord prefers longer lease terms.",
    apply_url: "https://streeteasy.com",
    pets: "Small pets allowed",
    laundry: "In building",
    elevator: "Yes",
    status: "Active",
    last_checked_date: "2026-01-28",
  },
];

async function seedListings() {
  console.log("Seeding pepe_listings table...\n");

  // Upsert listings (insert or update if exists)
  const { data, error } = await supabase
    .from("pepe_listings")
    .upsert(mockListings, { onConflict: "listing_id" })
    .select();

  if (error) {
    console.error("Error inserting listings:", error.message);
    return;
  }

  console.log(`Successfully inserted/updated ${data?.length || 0} listings:\n`);
  data?.forEach((listing) => {
    console.log(`  ${listing.listing_id}: ${listing.neighborhood}, ${listing.borough}`);
    console.log(`    $${listing.monthly_rent_usd}/mo | ${listing.bedrooms}BR/${listing.bathrooms}BA | Pets: ${listing.pets}`);
    console.log();
  });

  // Show total count
  const { count } = await supabase
    .from("pepe_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  console.log(`Total active listings in database: ${count}`);
  console.log("\nDone! Your listings are ready.");
}

seedListings().catch(console.error);
