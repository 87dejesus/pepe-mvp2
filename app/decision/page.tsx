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

function daysSince(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatLastChecked(dateISO: string | null): string {
  if (!dateISO) return "—";
  const parts = dateISO.split("-");
  if (parts.length !== 3) return dateISO;
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateISO;
  return `${m}/${d}/${y}`;
}

function textScore(s: string | null): number {
  if (!s) return 0;
  const t = s.toLowerCase();

  const hits = [
    "multiple",
    "several",
    "brand new",
    "new building",
    "high demand",
    "competitive",
    "limited",
    "apply",
    "fast",
    "now",
    "open house",
    "available now",
    "today",
    "tomorrow",
    "asap",
    "no fee",
    "fee",
    "best and final",
    "bidding",
    "counter",
  ];

  let score = 0;
  for (const k of hits) if (t.includes(k)) score += 1;

  return Math.min(score, 6);
}

function pressureLevel(listing: Listing): { level: "Low" | "Medium" | "High"; score: number; reasons: string[] } {
  const reasons: string[] = [];

  const signalScore =
    textScore(listing.pressure_signals) + textScore(listing.commute_note) + textScore(listing.deal_incentive);

  if (listing.pressure_signals) reasons.push("Market signals present");
  if (listing.commute_note) reasons.push("Commute constraint in play");
  if (listing.deal_incentive) reasons.push("Incentive could disappear");

  const d = daysSince(listing.last_checked_date);
  if (d !== null) {
    if (d <= 2) reasons.push("Checked very recently");
    else if (d <= 7) reasons.push("Checked this week");
    else reasons.push("Data may be stale");
  } else {
    reasons.push("Last checked date missing");
  }

  let score = signalScore;

  if (d !== null) {
    if (d <= 2) score += 2;
    else if (d <= 7) score += 1;
  }

  if (listing.broker_fee) {
    const bf = listing.broker_fee.toLowerCase();
    if (bf !== "no fee") {
      score += 1;
      reasons.push("Broker fee may raise friction/time");
    } else {
      reasons.push("No-fee reduces friction");
    }
  }

  score = Math.max(0, Math.min(score, 10));
  const level: "Low" | "Medium" | "High" = score >= 7 ? "High" : score >= 4 ? "Medium" : "Low";
  return { level, score, reasons: Array.from(new Set(reasons)) };
}

function buildTradeoffs(
  listing: Listing,
  pressure: { level: "Low" | "Medium" | "High"; score: number }
): { applyNow: string[]; waitConsciously: string[] } {
  const applyNow: string[] = [];
  const waitConsciously: string[] = [];

  if (pressure.level === "High") applyNow.push("Pressure is high — delays reduce your odds.");
  if (listing.deal_incentive) applyNow.push("Incentives are time-sensitive — lock it in while it’s still advertised.");
  if (listing.pressure_signals) applyNow.push("Market signals suggest this could move quickly.");
  if (listing.broker_fee && listing.broker_fee.toLowerCase() !== "no fee")
    applyNow.push("If there’s a fee, decide fast once you’re comfortable with the true total cost.");
  applyNow.push("If this fits your non-negotiables, applying early is usually rational in NYC.");

  if (pressure.level === "Low") waitConsciously.push("Pressure looks low — you may have room to compare.");
  if (listing.constraints) waitConsciously.push("Constraints listed — verify them before committing.");
  if (listing.commute_note) waitConsciously.push("Commute note present — confirm the reality before applying.");
  waitConsciously.push("Waiting only works if you define what you’re waiting for (price, location, terms).");

  return { applyNow: Array.from(new Set(applyNow)), waitConsciously: Array.from(new Set(waitConsciously)) };
}

function getSessionId(): string {
  const key = "pepe_session_id";
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  window.localStorage.setItem(key, newId);
  return newId;
}

export default function DecisionPage() {
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState<null | "apply" | "wait">(null);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  const [pickIndex, setPickIndex] = useState(() => Math.floor(Math.random() * 1_000_000));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { count, error: countError } = await supabase
        .from("pepe_listings")
        .select("listing_id", { count: "exact", head: true })
        .eq("status", "Active");

      if (cancelled) return;

      if (countError) {
        setError(countError.message);
        setListing(null);
        setLoading(false);
        return;
      }

      const total = count ?? 0;
      if (total <= 0) {
        setListing(null);
        setLoading(false);
        return;
      }

      const offset = pickIndex % total;

      const { data, error } = await supabase
        .from("pepe_listings")
        .select(
          [
            "listing_id",
            "city",
            "borough",
            "neighborhood",
            "building_name",
            "street_or_area",
            "bedrooms",
            "bathrooms",
            "monthly_rent_usd",
            "deal_incentive",
            "broker_fee",
            "building_type",
            "constraints",
            "commute_note",
            "pressure_signals",
            "primary_image_url",
            "apply_url",
            "curation_note",
            "status",
            "last_checked_date",
          ].join(",")
        )
        .eq("status", "Active")
        .order("listing_id", { ascending: true })
        .range(offset, offset);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setListing(null);
      } else {
        setListing((data?.[0] as Listing) ?? null);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [pickIndex]);

  const pressure = useMemo(() => (listing ? pressureLevel(listing) : null), [listing]);
  const tradeoffs = useMemo(() => (listing && pressure ? buildTradeoffs(listing, pressure) : null), [listing, pressure]);

  async function logDecision(outcome: "apply" | "wait") {
    if (!listing) return;

    setClicking(outcome);
    setError(null);

    const session_id = getSessionId();

    const { error } = await supabase.from("pepe_decision_logs").insert({
      session_id,
      step: 1,
      listing_id: listing.listing_id,
      outcome,
      paywall_seen: false,
      subscribed: false,
    });

    if (error) {
      setError(error.message);
      setClicking(null);
      return;
    }

    // MVP: always route to /exit; /exit controls “open link”
    window.location.href = "/exit";
  }

  if (loading) return <div style={{ padding: 24 }}>Loading listing…</div>;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      </div>
    );
  }

  if (!listing) return <div style={{ padding: 24 }}>No Active listings found in pepe_listings.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Listing: {listing.listing_id}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Status: {listing.status ?? "—"}</div>
      </div>

      <h1 style={{ margin: "0 0 8px 0" }}>
        {listing.neighborhood}, {listing.borough}
      </h1>

      <div style={{ marginBottom: 12, opacity: 0.9 }}>
        {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} • {listing.bathrooms} bath • $
        {listing.monthly_rent_usd.toLocaleString()}/mo
      </div>

      {listing.primary_image_url ? (
        <img
          src={listing.primary_image_url}
          alt={`${listing.neighborhood} listing`}
          style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12, marginBottom: 16 }}
        />
      ) : (
        <div style={{ marginBottom: 16, opacity: 0.7 }}>No primary_image_url provided.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Pressure</div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 800 }}>{pressure?.level}</span>
            <span style={{ opacity: 0.7 }}> (score {pressure?.score}/10)</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(pressure?.reasons ?? []).slice(0, 6).map((r) => (
              <li key={r} style={{ marginBottom: 6 }}>
                {r}
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
            Last checked: {formatLastChecked(listing.last_checked_date)}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Key facts</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            <div>Deal incentive: {listing.deal_incentive ?? "—"}</div>
            <div>Broker fee: {listing.broker_fee ?? "—"}</div>
            <div>Building type: {listing.building_type ?? "—"}</div>
            <div>Commute note: {listing.commute_note ?? "—"}</div>
            <div>Constraints: {listing.constraints ?? "—"}</div>
          </div>
        </div>
      </div>

      {listing.curation_note ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Curation note</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{listing.curation_note}</div>
        </div>
      ) : null}

      {listing.pressure_signals ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Pressure signals</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{listing.pressure_signals}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Apply now</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(tradeoffs?.applyNow ?? []).slice(0, 5).map((t) => (
              <li key={t} style={{ marginBottom: 6 }}>
                {t}
              </li>
            ))}
          </ul>
          <button
            onClick={() => logDecision("apply")}
            disabled={clicking !== null}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: clicking ? "not-allowed" : "pointer",
              opacity: clicking ? 0.6 : 1,
            }}
          >
            {clicking === "apply" ? "Saving…" : "Apply now"}
          </button>
        </div>

        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Wait consciously</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(tradeoffs?.waitConsciously ?? []).slice(0, 5).map((t) => (
              <li key={t} style={{ marginBottom: 6 }}>
                {t}
              </li>
            ))}
          </ul>
          <button
            onClick={() => logDecision("wait")}
            disabled={clicking !== null}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: clicking ? "not-allowed" : "pointer",
              opacity: clicking ? 0.6 : 1,
            }}
          >
            {clicking === "wait" ? "Saving…" : "Wait consciously"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={() => setPickIndex(Math.floor(Math.random() * 1_000_000))}
          disabled={clicking !== null}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: clicking ? "not-allowed" : "pointer",
            opacity: clicking ? 0.6 : 1,
          }}
        >
          Next listing
        </button>
        <div style={{ fontSize: 12, opacity: 0.6 }}>Shows another Active listing.</div>
      </div>
    </div>
  );
}
