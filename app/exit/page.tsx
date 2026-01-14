"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type DecisionRow = {
  session_id: string;
  outcome: "apply" | "wait";
  listing_id: string | null;
  created_at: string;
};

type Listing = {
  listing_id: string;
  neighborhood: string;
  borough: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent_usd: number;
  apply_url: string;
  curation_note: string | null;
  pressure_signals: string | null;
  deal_incentive: string | null;
  broker_fee: string | null;
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

function money(n: number) {
  try {
    return n.toLocaleString();
  } catch {
    return String(n);
  }
}

export default function ExitPage() {
  const params = useSearchParams();
  const choiceParam = params.get("choice"); // apply | wait

  const choice = useMemo(() => {
    return choiceParam === "apply" || choiceParam === "wait" ? choiceParam : null;
  }, [choiceParam]);

  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<DecisionRow | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const session_id = getSessionId();

      // 1) latest decision for this session
      const { data: d, error: dErr } = await supabase
        .from("pepe_decision_logs")
        .select("session_id,outcome,listing_id,created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (dErr) {
        setError(dErr.message);
        setDecision(null);
        setListing(null);
        setLoading(false);
        return;
      }

      const last = ((d?.[0] ?? null) as unknown) as DecisionRow | null;
      setDecision(last);

      if (!last?.listing_id) {
        setListing(null);
        setLoading(false);
        return;
      }

      // 2) fetch the listing for that decision
      const { data: l, error: lErr } = await supabase
        .from("pepe_listings")
        .select(
          [
            "listing_id",
            "neighborhood",
            "borough",
            "bedrooms",
            "bathrooms",
            "monthly_rent_usd",
            "apply_url",
            "curation_note",
            "pressure_signals",
            "deal_incentive",
            "broker_fee",
          ].join(",")
        )
        .eq("listing_id", last.listing_id)
        .limit(1);

      if (cancelled) return;

      if (lErr) {
        setError(lErr.message);
        setListing(null);
        setLoading(false);
        return;
      }

      setListing(((l?.[0] ?? null) as unknown) as Listing | null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // If query param is missing, we still render based on the last logged decision,
  // but we keep the page stable and clear.
  const effectiveChoice: "apply" | "wait" | null =
    choice ?? (decision?.outcome === "apply" || decision?.outcome === "wait" ? decision.outcome : null);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        <button
          onClick={() => (window.location.href = "/decision")}
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Back to decision
        </button>
      </div>
    );
  }

  if (!effectiveChoice) {
    return (
      <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>No decision found</h2>
        <p>Go back and choose Apply now or Wait consciously.</p>
        <button
          onClick={() => (window.location.href = "/decision")}
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Back to decision
        </button>
      </div>
    );
  }

  const title =
    listing ? `${listing.neighborhood}, ${listing.borough}` : "Your decision";

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 10 }}>
        {listing?.listing_id ? `Listing: ${listing.listing_id}` : null}
      </div>

      <h1 style={{ marginTop: 0 }}>{title}</h1>

      {listing ? (
        <div style={{ marginBottom: 14, opacity: 0.9 }}>
          {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} •{" "}
          {listing.bathrooms} bath • ${money(listing.monthly_rent_usd)}/mo
        </div>
      ) : null}

      {effectiveChoice === "apply" ? (
        <>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Why “Apply now” makes sense</div>
            <div style={{ lineHeight: 1.55 }}>
              You’re not claiming it’s perfect — you’re deciding it’s good enough under pressure.
              In NYC, speed often matters more than certainty.
              {listing?.deal_incentive ? (
                <>
                  <br />
                  <br />
                  Incentive note: <b>{listing.deal_incentive}</b>
                </>
              ) : null}
              {listing?.broker_fee ? (
                <>
                  <br />
                  Broker fee: <b>{listing.broker_fee}</b>
                </>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => {
              const url = listing?.apply_url;
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
            disabled={!listing?.apply_url}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: listing?.apply_url ? "pointer" : "not-allowed",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Open application link
          </button>

          <button
            onClick={() => (window.location.href = "/decision")}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              cursor: "pointer",
              fontWeight: 800,
              opacity: 0.9,
            }}
          >
            Back to decision
          </button>
        </>
      ) : (
        <>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Why “Wait consciously” makes sense</div>
            <div style={{ lineHeight: 1.55 }}>
              Waiting is only useful if you’re verifying something specific (price reality, constraints, commute, or alternatives).
              If nothing changes, waiting adds risk instead of reducing it.
              {listing?.pressure_signals ? (
                <>
                  <br />
                  <br />
                  Pressure signals to watch: <b>{listing.pressure_signals}</b>
                </>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => (window.location.href = "/decision")}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Back to decision
          </button>
        </>
      )}
    </div>
  );
}
