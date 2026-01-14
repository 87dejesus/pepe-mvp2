"use client";

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
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
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

export default function ExitClient() {
  const params = useSearchParams();
  const choiceParam = params.get("choice"); // apply | wait
  const choice = useMemo(
    () => (choiceParam === "apply" || choiceParam === "wait" ? choiceParam : null),
    [choiceParam]
  );

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

      const { data: d, error: dErr } = await supabase
        .from("pepe_decision_logs")
        .select("session_id,outcome,listing_id,created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (dErr) {
        setError(dErr.message);
        setLoading(false);
        return;
      }

      const last = ((d?.[0] ?? null) as unknown) as DecisionRow | null;
      setDecision(last);

      if (!last?.listing_id) {
        setLoading(false);
        return;
      }

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

  const effectiveChoice: "apply" | "wait" | null =
    choice ?? (decision?.outcome === "apply" || decision?.outcome === "wait" ? decision.outcome : null);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
        <strong>Error</strong>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        <button onClick={() => (window.location.href = "/decision")}>Back to decision</button>
      </div>
    );
  }

  if (!effectiveChoice) {
    return (
      <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
        <h2>No decision found</h2>
        <button onClick={() => (window.location.href = "/decision")}>Back to decision</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1>
        {listing ? `${listing.neighborhood}, ${listing.borough}` : "Your decision"}
      </h1>

      {listing && (
        <p>
          {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} •{" "}
          {listing.bathrooms} bath • ${money(listing.monthly_rent_usd)}/mo
        </p>
      )}

      {effectiveChoice === "apply" ? (
        <>
          <p>
            You chose to apply knowing the pressure and tradeoffs. Acting now
            protects you from losing the opportunity.
          </p>
          <button
            disabled={!listing?.apply_url}
            onClick={() => listing?.apply_url && window.open(listing.apply_url, "_blank")}
          >
            Open application link
          </button>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => (window.location.href = "/decision")}>
              Back to decision
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            You chose to wait consciously. Waiting helps only if something
            specific can change.
          </p>
          <button onClick={() => (window.location.href = "/decision")}>
            Back to decision
          </button>
        </>
      )}
    </div>
  );
}


