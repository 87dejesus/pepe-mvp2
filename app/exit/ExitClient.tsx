"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type DecisionRow = {
  session_id: string;
  outcome: "apply" | "wait";
  listing_id: string | null; // this is listing_id text (NYC-0001), not uuid
  listing_uuid: string | null; // UUID (FK to pepe_listings.id)
  created_at: string;
};

type Listing = {
  id: string;
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
  const router = useRouter();
  const choiceParam = params.get("choice"); // apply | wait
  const listingUuidParam = params.get("listing_uuid"); // UUID from URL (primary source of truth)

  const choice = useMemo(
    () => (choiceParam === "apply" || choiceParam === "wait" ? choiceParam : null),
    [choiceParam]
  );

  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<DecisionRow | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [applyUrl, setApplyUrl] = useState<string | null>(null);
  const [applyUrlLoaded, setApplyUrlLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFallbackButton, setShowFallbackButton] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setDecision(null);
      setListing(null);
      setApplyUrl(null);
      setApplyUrlLoaded(false);

      // If listing_uuid is in URL, use it directly as source of truth (skip decision log lookup)
      if (listingUuidParam) {
        console.log('DEBUG: Using listing_uuid from URL (primary source):', listingUuidParam);
        
        // Try common ID column name variations
        const idColumns = ["id", "ID", "listing_uuid", "uuid", "Id", "listingId"];
        let l: any = null;
        let lErr: any = null;
        
        for (const idColumn of idColumns) {
          const { data, error } = await supabase
            .from("pepe_listings")
            .select("*")
            .eq(idColumn, listingUuidParam)
            .maybeSingle();
          
          if (!error && data) {
            l = data;
            break;
          }
          if (error && !error.message.includes("does not exist")) {
            lErr = error;
            break;
          }
        }

        if (cancelled) return;

        if (lErr || !l) {
          setError(lErr?.message || "Listing not found");
          setLoading(false);
          setApplyUrlLoaded(true);
          return;
        }

        // Normalize the row to always have "id" field
        const r = l as Record<string, unknown>;
        const id = (r["id"] || r["ID"] || r["listing_uuid"] || r["uuid"] || r["Id"] || r["listingId"]) as string;
        const normalizedRow = { ...r, id } as Listing;
        
        setListing(normalizedRow);

        if (normalizedRow?.apply_url) {
          setApplyUrl(normalizedRow.apply_url);
        } else {
          setApplyUrl(null);
        }
        setApplyUrlLoaded(true);
        setLoading(false);
        return;
      }

      // Fallback: If no URL param, try to get from decision log
      const session_id = getSessionId();

      // Step 1: get last decision for this session
      const { data: d, error: dErr } = await supabase
        .from("pepe_decision_logs")
        .select("session_id,outcome,listing_id,listing_uuid,created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (dErr) {
        setError(dErr.message);
        setLoading(false);
        setApplyUrlLoaded(true);
        return;
      }

      const last = ((d?.[0] ?? null) as unknown) as DecisionRow | null;
      setDecision(last);

      // Step 2: Find listing using decision log data
      const listingUuid = last?.listing_uuid ?? null;
      const listingIdText = last?.listing_id ?? null;
      
      // Try common ID column name variations
      const idColumns = ["id", "ID", "listing_uuid", "uuid", "Id", "listingId"];
      let l: any = null;
      let lErr: any = null;

      if (listingUuid) {
        // Try different ID column names
        for (const idColumn of idColumns) {
          const { data, error } = await supabase
            .from("pepe_listings")
            .select("*")
            .eq(idColumn, listingUuid)
            .maybeSingle();
          
          if (!error && data) {
            l = data;
            break;
          }
          if (error && !error.message.includes("does not exist")) {
            lErr = error;
            break;
          }
        }
      } else if (listingIdText) {
        const { data, error } = await supabase
          .from("pepe_listings")
          .select("*")
          .eq("listing_id", listingIdText)
          .maybeSingle();
        l = data;
        lErr = error;
      } else {
        setLoading(false);
        setApplyUrlLoaded(true);
        return;
      }

      if (cancelled) return;

      if (lErr) {
        setError(lErr.message);
        setLoading(false);
        setApplyUrlLoaded(true);
        return;
      }

      // Normalize the row to always have "id" field
      let normalizedRow: Listing | null = null;
      if (l) {
        const r = l as Record<string, unknown>;
        const id = (r["id"] || r["ID"] || r["listing_uuid"] || r["uuid"] || r["Id"] || r["listingId"]) as string;
        normalizedRow = { ...r, id } as Listing;
        setListing(normalizedRow);
      } else {
        setListing(null);
      }

      // Extract apply_url directly from the listing (already fetched above)
      if (normalizedRow?.apply_url) {
        setApplyUrl(normalizedRow.apply_url);
      } else {
        setApplyUrl(null);
      }
      setApplyUrlLoaded(true);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [listingUuidParam]);

  const effectiveChoice: "apply" | "wait" | null =
    choice ?? (decision?.outcome === "apply" || decision?.outcome === "wait" ? decision.outcome : null);

  // Redirect to /decision if listing is invalid after loading completes
  // BUT: Do NOT redirect if choice param is present (allows safe mode rendering)
  useEffect(() => {
    // If choice param exists, stay on page even without listing (safe mode)
    if (choice) return;
    
    // Only redirect if no choice param AND listing is missing after load completes
    if (!loading && !listing) {
      router.push("/decision");
    }
  }, [loading, listing, router, choice]);

  // Redirect to /decision if apply_url is missing when choice is "apply"
  // BUT: Do NOT redirect if choice param is present (allows safe mode rendering)
  useEffect(() => {
    // If choice param exists, stay on page even without applyUrl (safe mode)
    if (choice) return;
    
    // Only redirect if: no choice param AND loading done AND applyUrl loaded AND choice is "apply" AND no applyUrl
    if (!loading && applyUrlLoaded && effectiveChoice === "apply" && !applyUrl) {
      router.push("/decision");
    }
  }, [loading, applyUrlLoaded, effectiveChoice, applyUrl, router, choice]);

  const title = listing ? `${listing.neighborhood}, ${listing.borough}` : "Your decision";

  function openApply() {
    const url = applyUrl?.trim();
    if (!url) {
      return; // Button is disabled, this shouldn't be called
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const hasApplyUrl = !!applyUrl?.trim();

  // Retry mechanism: if listing is null but listing_uuid exists, retry after 2 seconds
  useEffect(() => {
    if (choice && !loading && !listing && (listingUuidParam || decision?.listing_uuid)) {
      const uuidToRetry = listingUuidParam || decision?.listing_uuid;
      const retryTimer = setTimeout(async () => {
        // Try common ID column name variations
        const idColumns = ["id", "ID", "listing_uuid", "uuid", "Id", "listingId"];
        let l: any = null;
        let lErr: any = null;
        
        for (const idColumn of idColumns) {
          const { data, error } = await supabase
            .from("pepe_listings")
            .select("*")
            .eq(idColumn, uuidToRetry)
            .maybeSingle();
          
          if (!error && data) {
            l = data;
            break;
          }
          if (error && !error.message.includes("does not exist")) {
            lErr = error;
            break;
          }
        }

        if (lErr) {
          return;
        }

        // Normalize the row to always have "id" field
        if (l) {
          const r = l as Record<string, unknown>;
          const id = (r["id"] || r["ID"] || r["listing_uuid"] || r["uuid"] || r["Id"] || r["listingId"]) as string;
          const normalizedRow = { ...r, id } as Listing;
          setListing(normalizedRow);
          if (normalizedRow.apply_url) {
            setApplyUrl(normalizedRow.apply_url);
          }
          setApplyUrlLoaded(true);
        }
      }, 2000);

      return () => clearTimeout(retryTimer);
    }
  }, [choice, loading, listing, listingUuidParam, decision?.listing_uuid]);

  // Fallback button: Show after 5 seconds if listing is still null and choice is "apply"
  useEffect(() => {
    if (choice === "apply" && !loading && !listing && (listingUuidParam || decision?.listing_uuid)) {
      const fallbackTimer = setTimeout(() => {
        if (!listing) {
          setShowFallbackButton(true);
        }
      }, 5000);

      return () => clearTimeout(fallbackTimer);
    } else {
      setShowFallbackButton(false);
    }
  }, [choice, loading, listing, listingUuidParam, decision?.listing_uuid]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  // Safe mode: If choice param exists, allow rendering even without listing
  // Do not render if listing is invalid AND no choice param - redirect useEffect will handle navigation
  if (!listing && !choice) return null;

  // Safe mode: If choice param exists, allow rendering even without applyUrl
  // Do not render if apply_url is missing AND no choice param - redirect useEffect will handle navigation
  if (applyUrlLoaded && effectiveChoice === "apply" && !applyUrl && !choice) return null;

  if (!effectiveChoice) {
    return (
      <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>No decision found</h1>
        <button
          onClick={() => (window.location.href = "/decision")}
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Back to decision
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, opacity: 0.75 }}>
        <div style={{ fontSize: 12 }}>{listing?.listing_id ? `Listing: ${listing.listing_id}` : "Listing: —"}</div>
        <div style={{ fontSize: 12 }}>{decision?.session_id ? `Session: ${decision.session_id}` : ""}</div>
      </div>

      <h1 style={{ marginTop: 0 }}>{title}</h1>

      {listing ? (
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} • {listing.bathrooms} bath • $
          {money(listing.monthly_rent_usd)}/mo
        </div>
      ) : choice ? (
        <div style={{ marginBottom: 12, opacity: 0.75 }}>
          Loading listing details...
        </div>
      ) : (
        <div style={{ marginBottom: 12, opacity: 0.75 }}>
          Couldn’t load the listing details. (We can still continue.)
        </div>
      )}

      {error ? (
        <div style={{ border: "1px solid rgba(220, 38, 38, 0.35)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
        </div>
      ) : null}

      {effectiveChoice === "apply" ? (
        <>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Why this makes sense</div>
            <div style={{ lineHeight: 1.55 }}>
              You chose speed over optionality — that is often correct in NYC when something fits.
              <br />
              Market signals increase the cost of delay.
              <br />
              Incentives tend to disappear; acting now preserves the option.
              <br />
              If it meets your non-negotiables, early action is a rational bet.
            </div>

            {listing?.deal_incentive ? (
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Incentive: <b>{listing.deal_incentive}</b>
              </div>
            ) : null}
            {listing?.broker_fee ? (
              <div style={{ marginTop: 6, opacity: 0.9 }}>
                Broker fee: <b>{listing.broker_fee}</b>
              </div>
            ) : null}
          </div>

          {hasApplyUrl && (
            <button
              onClick={openApply}
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
              Open application link
            </button>
          )}

          {!hasApplyUrl && showFallbackButton && (
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
              Check Listing
            </button>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={() => (window.location.href = "/decision")}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Back to decision
            </button>
            <button
              onClick={() => (window.location.href = "/flow")}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Restart flow
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Why this makes sense</div>
            <div style={{ lineHeight: 1.55 }}>
              Waiting preserves optionality — but only if you’re testing something specific.
              <br />
              Define what would change your decision, then compare fast.
              <br />
              If nothing changes, waiting becomes risk, not caution.
            </div>

            {listing?.pressure_signals ? (
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Pressure signals to watch: <b>{listing.pressure_signals}</b>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => (window.location.href = "/decision")}
              style={{
                flex: 1,
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
            <button
              onClick={() => (window.location.href = "/flow")}
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Restart flow
            </button>
          </div>
        </>
      )}
    </div>
  );
}
