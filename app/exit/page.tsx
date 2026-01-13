"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type DecisionLog = {
  created_at: string;
  session_id: string;
  listing_id: string | null; // NYC-0001
  outcome: "apply" | "wait" | null;
};

type Listing = {
  listing_id: string;
  city: string;
  borough: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent_usd: number;

  deal_incentive: string | null;
  broker_fee: string | null;
  constraints: string | null;
  commute_note: string | null;
  pressure_signals: string | null;
  last_checked_date: string | null;

  apply_url: string;
};

function getSessionId(): string | null {
  const key = "pepe_session_id";
  return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
}

function formatMoney(n: number): string {
  try {
    return `$${n.toLocaleString()}/mo`;
  } catch {
    return `$${n}/mo`;
  }
}

function formatOutcome(o: "apply" | "wait" | null): string {
  if (o === "apply") return "APPLY NOW";
  if (o === "wait") return "WAIT CONSCIOUSLY";
  return "—";
}

function rationale(outcome: "apply" | "wait" | null, listing: Listing | null): string[] {
  if (!outcome || !listing) return ["Decision saved."];

  const bullets: string[] = [];

  if (outcome === "apply") {
    bullets.push("You chose speed over optionality — that is often correct in NYC when something fits.");
    if (listing.pressure_signals) bullets.push("Market signals were present, which increases the cost of delay.");
    if (listing.deal_incentive) bullets.push("Incentives tend to disappear; acting now preserves the option.");
    bullets.push("If it meets your non-negotiables, early action is a rational bet.");
  }

  if (outcome === "wait") {
    bullets.push("You chose optionality over speed — that is rational if you have clear criteria.");
    if (listing.constraints) bullets.push("Constraints were present; waiting can be smart while you verify them.");
    if (listing.commute_note) bullets.push("Commute is a real constraint; validating it before applying is sensible.");
    bullets.push("Waiting works best when you define exactly what must improve.");
  }

  return bullets.slice(0, 4);
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [log, setLog] = useState<DecisionLog | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const session_id = getSessionId();
      if (!session_id) {
        setLog(null);
        setListing(null);
        setLoading(false);
        return;
      }

      const { data: logs, error: logErr } = await supabase
        .from("pepe_decision_logs")
        .select("created_at, session_id, listing_id, outcome")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (logErr) {
        setError(logErr.message);
        setLoading(false);
        return;
      }

      const latest = (logs?.[0] as DecisionLog) ?? null;
      setLog(latest);

      const lid = latest?.listing_id;
      if (!lid) {
        setListing(null);
        setLoading(false);
        return;
      }

      const { data: listings, error: listingErr } = await supabase
        .from("pepe_listings")
        .select(
          [
            "listing_id",
            "city",
            "borough",
            "neighborhood",
            "bedrooms",
            "bathrooms",
            "monthly_rent_usd",
            "deal_incentive",
            "broker_fee",
            "constraints",
            "commute_note",
            "pressure_signals",
            "last_checked_date",
            "apply_url",
          ].join(",")
        )
        .eq("listing_id", lid)
        .limit(1);

      if (cancelled) return;

      if (listingErr) {
        setError(listingErr.message);
        setLoading(false);
        return;
      }

      setListing((listings?.[0] as Listing) ?? null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const bullets = useMemo(() => rationale(log?.outcome ?? null, listing), [log, listing]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      </div>
    );
  }

  if (!log) {
    return (
      <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 10px 0" }}>Exit</h1>
        <div style={{ opacity: 0.8, marginBottom: 14 }}>No decision found for this session yet.</div>
        <button
          onClick={() => (window.location.href = "/decision")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
          }}
        >
          Back to decision
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 10px 0" }}>You chose: {formatOutcome(log.outcome)}</h1>

      {listing ? (
        <div style={{ marginBottom: 14, opacity: 0.9 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {listing.neighborhood}, {listing.borough} •{" "}
            {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} • {listing.bathrooms} bath •{" "}
            {formatMoney(listing.monthly_rent_usd)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Listing: {listing.listing_id}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 14, opacity: 0.8 }}>Decision saved. Listing details not found.</div>
      )}

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Why this makes sense</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {bullets.map((b) => (
            <li key={b} style={{ marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {log.outcome === "apply" && listing?.apply_url ? (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => window.open(listing.apply_url, "_blank", "noopener,noreferrer")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: "pointer",
            }}
          >
            Open application link
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => (window.location.href = "/decision")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
          }}
        >
          Back to decision
        </button>

        <button
          onClick={() => (window.location.href = "/flow")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
          }}
        >
          Restart flow
        </button>
      </div>
    </div>
  );
}
