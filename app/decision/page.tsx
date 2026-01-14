"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  ...
}

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
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  window.localStorage.setItem(key, id);
  return id;
}

function formatMoney(n: number) {
  try {
    return n.toLocaleString();
  } catch {
    return String(n);
  }
}

function formatMMDDYYYY(dateISO: string | null) {
  if (!dateISO) return "—";
  const parts = dateISO.split("-");
  if (parts.length !== 3) return dateISO;
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateISO;
  return `${m}/${d}/${y}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function daysSince(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function textScore(s: string | null): number {
  if (!s) return 0;
  const t = s.toLowerCase();
  const keys = [
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
    "best and final",
    "bidding",
  ];
  let score = 0;
  for (const k of keys) if (t.includes(k)) score += 1;
  return clamp(score, 0, 6);
}

function computePressure(listing: Listing) {
  const reasons: string[] = [];
  let score = 0;

  const signal =
    textScore(listing.pressure_signals) + textScore(listing.deal_incentive) + textScore(listing.commute_note);
  score += signal;

  if (listing.pressure_signals) reasons.push("Market signals present");
  if (listing.deal_incentive) reasons.push("Incentive could disappear");
  if (listing.commute_note) reasons.push("Commute constraint in play");

  const d = daysSince(listing.last_checked_date);
  if (d !== null) {
    if (d <= 2) {
      score += 2;
      reasons.push("Checked very recently");
    } else if (d <= 7) {
      score += 1;
      reasons.push("Checked this week");
    } else {
      reasons.push("Data may be stale");
    }
  } else {
    reasons.push("Last checked date missing");
  }

  if (listing.broker_fee) {
    const bf = listing.broker_fee.toLowerCase();
    if (bf !== "no") {
      score += 1;
      reasons.push("Broker fee may add friction");
    } else {
      reasons.push("No broker fee reduces friction");
    }
  }

  score = clamp(score, 0, 10);
  const level = score >= 7 ? "High" : score >= 4 ? "Medium" : "Low";
  return { level, score, reasons: Array.from(new Set(reasons)) };
}

function buildTradeoffs(listing: Listing, pressureLevel: "Low" | "Medium" | "High") {
  const applyNow: string[] = [];
  const waitConsciously: string[] = [];

  if (pressureLevel === "High") applyNow.push("Pressure is high — delays reduce your odds.");
  if (listing.deal_incentive) applyNow.push("Incentives can disappear — acting now preserves upside.");
  if (listing.pressure_signals) applyNow.push("Signals suggest this may move quickly.");
  applyNow.push("If it fits your non-negotiables, early action is rational in NYC.");

  if (pressureLevel === "Low") waitConsciously.push("Pressure looks low — you have room to compare.");
  if (listing.constraints) waitConsciously.push("Constraints exist — verify before committing.");
  if (listing.commute_note) waitConsciously.push("Commute matters — confirm reality, not assumptions.");
  waitConsciously.push("Waiting only helps if you define what would change your decision.");

  return {
    applyNow: Array.from(new Set(applyNow)).slice(0, 5),
    waitConsciously: Array.from(new Set(waitConsciously)).slice(0, 5),
  };
}

export default function DecisionPage() {
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clicking, setClicking] = useState<null | "apply" | "wait">(null);

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { count, error: countError } = await supabase
        .from("pepe_listings")
        id.select("listing_id", { count: "exact", head: true })
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

      const offset = seed % total;

      const { data, error } = await supabase
        .from("pepe_listings")
        id.select(
          [
            "id",
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
        setListing(((data?.[0] ?? null) as unknown) as Listing | null);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  const pressure = useMemo(() => (listing ? computePressure(listing) : null), [listing]);
  const tradeoffs = useMemo(
    () => (listing && pressure ? buildTradeoffs(listing, pressure.level as "Low" | "Medium" | "High") : null),

    [listing, pressure]
  );

  async function logDecision(outcome: "apply" | "wait") {
    if (!listing) return;

    setClicking(outcome);
    setError(null);

    const session_id = getSessionId();

    const { error } = aawait supabase.from("pepe_decision_logs").insert({
  session_id,
  step: 1,
  listing_id: listing.listing_id,
  listing_uuid: listing.id,
  outcome,
  paywall_seen: false,
  subscribed: false,
});


    if (error) {
      setError(error.message);
      setClicking(null);
      return;
    }

    // ✅ this restores the old flow: explanation next, then action button there
    window.location.href = `/exit?choice=${outcome}`;
  }

  if (loading) return <div style={{ padding: 24 }}>Loading listing…</div>;

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        <button
          onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        No Active listings found in <code>pepe_listings</code>.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, opacity: 0.8 }}>
        <div style={{ fontSize: 12 }}>Listing: {listing.listing_id}</div>
        <div style={{ fontSize: 12 }}>Last checked: {formatMMDDYYYY(listing.last_checked_date)}</div>
      </div>

      <h1 style={{ margin: "0 0 8px 0" }}>
        {listing.neighborhood}, {listing.borough}
      </h1>

      <div style={{ marginBottom: 12, opacity: 0.9, fontSize: 16 }}>
        {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} • {listing.bathrooms} bath • $
        {formatMoney(listing.monthly_rent_usd)}/mo
      </div>

      {listing.primary_image_url ? (
        <img
          src={listing.primary_image_url}
          alt={`${listing.neighborhood} listing`}
          style={{ width: "100%", maxHeight: 440, objectFit: "cover", borderRadius: 14, marginBottom: 16 }}
        />
      ) : (
        <div style={{ marginBottom: 16, opacity: 0.7 }}>No primary_image_url provided.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Curation note</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{listing.curation_note ?? "—"}</div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Pressure</div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 800 }}>{pressure?.level}</span>
                <span style={{ opacity: 0.7 }}> (score {pressure?.score}/10)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(pressure?.reasons ?? []).slice(0, 4).map((r) => (
                  <li key={r} style={{ marginBottom: 6 }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Key facts</div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                <div>Deal: {listing.deal_incentive ?? "—"}</div>
                <div>Broker fee: {listing.broker_fee ?? "—"}</div>
                <div>Type: {listing.building_type ?? "—"}</div>
                <div>Commute: {listing.commute_note ?? "—"}</div>
              </div>
            </div>
          </div>

          {listing.pressure_signals ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Pressure signals</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{listing.pressure_signals}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Apply now</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(tradeoffs?.applyNow ?? []).map((t) => (
                <li key={t} style={{ marginBottom: 6 }}>
                  {t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => logDecision("apply")}
              disabled={clicking !== null}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: clicking ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {clicking === "apply" ? "Saving…" : "Apply now"}
            </button>
          </div>

          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Wait consciously</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(tradeoffs?.waitConsciously ?? []).map((t) => (
                <li key={t} style={{ marginBottom: 6 }}>
                  {t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => logDecision("wait")}
              disabled={clicking !== null}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: clicking ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {clicking === "wait" ? "Saving…" : "Wait consciously"}
            </button>
          </div>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
            disabled={clicking !== null}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: clicking ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            Next listing
          </button>

          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Tip: click <b>Next listing</b> to see a different Active listing.
          </div>
        </div>
      </div>
    </div>
  );
}
