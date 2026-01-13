"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Listing = {
  listing_id: string;
  city: string;
  borough: string;
  neighborhood: string;

  building_name: string | null;
  street_or_area: string | null;

  bedrooms: number;
  bathrooms: number;

  monthly_rent_usd: number;

  deal_incentive: string | null;
  broker_fee: string | null;
  building_type: string | null;

  constraints: string | null;
  commute_note: string | null;
  pressure_signals: string | null;

  primary_image_url: string | null;
  apply_url: string;

  curation_note: string | null;
  status: string | null;
  last_checked_date: string | null;
};

function getSessionId(): string {
  const key = "pepe_session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id =
    crypto.randomUUID?.() ??
    `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  localStorage.setItem(key, id);
  return id;
}

function daysSince(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function pressureLevel(listing: Listing) {
  let score = 0;
  const reasons: string[] = [];

  if (listing.pressure_signals) {
    score += 2;
    reasons.push("Market pressure signals present");
  }

  if (listing.deal_incentive) {
    score += 1;
    reasons.push("Time-sensitive incentive");
  }

  const d = daysSince(listing.last_checked_date);
  if (d !== null && d <= 3) {
    score += 2;
    reasons.push("Recently checked listing");
  }

  if (listing.broker_fee && listing.broker_fee !== "No") {
    score += 1;
    reasons.push("Broker fee involved");
  }

  const level = score >= 5 ? "High" : score >= 3 ? "Medium" : "Low";
  return { level, score, reasons };
}

function buildTradeoffs(listing: Listing, pressure: any) {
  return {
    applyNow: [
      "Speed increases odds in competitive markets",
      "Delaying may remove incentives",
      "If it fits your criteria, acting early is rational",
    ],
    waitConsciously: [
      "Waiting preserves optionality",
      "Useful if constraints are unclear",
      "Only wait with a clear comparison plan",
    ],
  };
}

export default function DecisionPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState<"apply" | "wait" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickIndex, setPickIndex] = useState(Math.floor(Math.random() * 100000));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { count } = await supabase
        .from("pepe_listings")
        .select("listing_id", { count: "exact", head: true })
        .eq("status", "Active");

      if (!count || cancelled) {
        setListing(null);
        setLoading(false);
        return;
      }

      const offset = pickIndex % count;

      const { data, error } = await supabase
        .from("pepe_listings")
        .select("*")
        .eq("status", "Active")
        .order("listing_id", { ascending: true })
        .range(offset, offset);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setListing(null);
      } else {
        setListing(((data?.[0] ?? null) as unknown) as Listing | null);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pickIndex]);

  const pressure = useMemo(
    () => (listing ? pressureLevel(listing) : null),
    [listing]
  );

  const tradeoffs = useMemo(
    () => (listing && pressure ? buildTradeoffs(listing, pressure) : null),
    [listing, pressure]
  );

  async function logDecision(outcome: "apply" | "wait") {
    if (!listing) return;

    setClicking(outcome);
    const session_id = getSessionId();

    const { error } = await supabase.from("pepe_decision_logs").insert({
      session_id,
      step: 1,
      listing_id: listing.listing_id,
      outcome,
    });

    if (error) {
      setError(error.message);
      setClicking(null);
      return;
    }

    window.location.href = "/exit";
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <pre style={{ padding: 24 }}>{error}</pre>;
  if (!listing) return <div style={{ padding: 24 }}>No listings found.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>
        {listing.neighborhood}, {listing.borough}
      </h1>

      <div style={{ marginBottom: 12 }}>
        {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} •{" "}
        {listing.bathrooms} bath • $
        {listing.monthly_rent_usd.toLocaleString()}/mo
      </div>

      {listing.primary_image_url && (
        <img
          src={listing.primary_image_url}
          style={{
            width: "100%",
            maxHeight: 420,
            objectFit: "cover",
            borderRadius: 12,
            marginBottom: 16,
          }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3>Apply now</h3>
          <ul>
            {tradeoffs?.applyNow.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button disabled={!!clicking} onClick={() => logDecision("apply")}>
            Apply now
          </button>
        </div>

        <div>
          <h3>Wait consciously</h3>
          <ul>
            {tradeoffs?.waitConsciously.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button disabled={!!clicking} onClick={() => logDecision("wait")}>
            Wait consciously
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => setPickIndex(Math.random())}>
          Next listing
        </button>
      </div>
    </div>
  );
}
