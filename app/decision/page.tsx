"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type PressureLevel = "High" | "Medium" | "Low";

type Listing = {
  id: string; // UUID (primary key)
  listing_id: string; // NYC-0001 (human)
  city: string;
  borough: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent_usd: number;
  deal_incentive: string | null;
  broker_fee: string | null;
  building_type: string | null;
  constraints: string | null;
  commute_note: string;
  pressure_signals: string | null;
  primary_image_url: string | null;
  apply_url: string;
  curation_note: string;
  status: string | null;
  last_checked_date: string | null;
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
    return `$${n.toLocaleString()}`;
  } catch {
    return `$${n}`;
  }
}

function formatDateMMDDYYYY(iso: string | null) {
  if (!iso) return null;
  // iso might be "2026-01-09" or timestamp; handle both
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // fallback for "YYYY-MM-DD"
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return iso;
  }
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const y = String(d.getFullYear());
  return `${m}/${day}/${y}`;
}

function computePressure(listing: Listing): { level: PressureLevel; reasons: string[] } {
  const text = (listing.pressure_signals ?? "").toLowerCase();
  const reasons: string[] = [];

  const highSignals = ["multiple", "bidding", "fast", "urgent", "limited", "today", "high demand", "move-in asap"];
  const mediumSignals = ["available", "new building", "several", "inventory", "incentive", "promo"];

  const hasHigh = highSignals.some((s) => text.includes(s));
  const hasMedium = mediumSignals.some((s) => text.includes(s));

  if (hasHigh) reasons.push("Pressure signals suggest competition or speed is required.");
  if (listing.deal_incentive) reasons.push("Incentives can disappear quickly in NYC.");
  if ((listing.broker_fee ?? "").toLowerCase() === "yes") reasons.push("Broker fee increases switching cost.");

  let level: PressureLevel = "Low";
  if (hasHigh) level = "High";
  else if (hasMedium || listing.deal_incentive) level = "Medium";

  if (reasons.length === 0) reasons.push("No strong pressure signals were detected.");

  return { level, reasons };
}

function buildTradeoffs(listing: Listing, level: PressureLevel) {
  const applyNow: string[] = [];
  const waitConsciously: string[] = [];

  // Apply now bullets
  applyNow.push("Speed increases odds in competitive markets");
  if (level !== "Low") applyNow.push("Delaying may remove incentives");
  applyNow.push("If it fits your criteria, acting early is rational");

  // Wait consciously bullets
  waitConsciously.push("Waiting preserves optionality");
  waitConsciously.push("Useful if constraints are unclear");
  if (level === "High") waitConsciously.push("Only wait with a clear comparison plan");

  return { applyNow, waitConsciously };
}

function getSeenListingIds(): Set<string> {
  const key = "pepe_seen_listings";
  const stored = window.localStorage.getItem(key);
  if (!stored) return new Set();
  try {
    const ids = JSON.parse(stored) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function addSeenListingId(id: string): void {
  const key = "pepe_seen_listings";
  const seen = getSeenListingIds();
  seen.add(id);
  window.localStorage.setItem(key, JSON.stringify(Array.from(seen)));
}

function clearSeenListings(): void {
  const key = "pepe_seen_listings";
  window.localStorage.removeItem(key);
}

export default function DecisionPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);
  const [showFeedbackScreen, setShowFeedbackScreen] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [noMoreListings, setNoMoreListings] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  async function loadListing(requestedOffset?: number) {
    setLoading(true);
    setError(null);
    setFadeIn(false); // Fade out when starting to load new listing

    // Load survey answers from localStorage
    const LS_KEY = "pepe_answers_v1";
    let surveyAnswers: { budgetMax?: number; beds?: "0" | "1" | "2" | "3+" } | null = null;
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (stored) {
        surveyAnswers = JSON.parse(stored);
      }
    } catch (e) {
      // If parsing fails, continue without filters
      console.warn("Failed to parse survey answers:", e);
    }

    // Extract filter values
    const maxPrice = surveyAnswers?.budgetMax;
    const bedsPreference = surveyAnswers?.beds;
    
    // Convert beds preference to number or range
    // "0" -> 0, "1" -> 1, "2" -> 2, "3+" -> use .gte(3)
    let requestedBedrooms: number | null = null;
    let useBedroomsGte = false;
    if (bedsPreference === "0") requestedBedrooms = 0;
    else if (bedsPreference === "1") requestedBedrooms = 1;
    else if (bedsPreference === "2") requestedBedrooms = 2;
    else if (bedsPreference === "3+") {
      requestedBedrooms = 3;
      useBedroomsGte = true;
    }

    // Step 1: Get count of Active listings if not cached
    // If filters are present, always recalculate count to ensure accuracy
    const filtersActive = (maxPrice !== undefined && maxPrice !== null) || requestedBedrooms !== null;
    setHasFilters(filtersActive);
    let count = filtersActive ? null : activeCount; // Invalidate cache if filters are present
    if (count === null) {
      let countQuery = supabase
        .from("pepe_listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");

      // Apply price filter if available
      if (maxPrice !== undefined && maxPrice !== null) {
        countQuery = countQuery.lte("monthly_rent_usd", maxPrice);
      }

      // Apply bedrooms filter if available
      if (requestedBedrooms !== null) {
        if (useBedroomsGte) {
          countQuery = countQuery.gte("bedrooms", requestedBedrooms);
        } else {
          countQuery = countQuery.eq("bedrooms", requestedBedrooms);
        }
      }

      const { count: activeCountResult, error: countErr } = await countQuery;

      if (countErr) {
        setListing(null);
        setError(countErr.message);
        setLoading(false);
        return;
      }

      count = activeCountResult ?? 0;
      setActiveCount(count);

      if (count === 0) {
        setListing(null);
        setError(null); // Clear error, we'll show a better message
        setNoMoreListings(false); // This is "no matches", not "seen all"
        setLoading(false);
        return;
      }
    }

    // Check if we've seen all listings
    const seenIds = getSeenListingIds();
    if (seenIds.size >= count && count > 0) {
      setNoMoreListings(true);
      setShowFeedbackScreen(true);
      setListing(null);
      setLoading(false);
      return;
    }

    // Step 2: Determine safe offset (random if not specified, within valid range)
    // Ensure offset is within bounds and try to avoid already-seen listings
    let safeOffset: number;
    if (count === 0) {
      // This should have been caught earlier, but handle it just in case
      setListing(null);
      setError(null);
      setLoading(false);
      return;
    }
    
    // If we've seen all or almost all listings, check if there are any unseen
    if (seenIds.size >= count) {
      setNoMoreListings(true);
      setShowFeedbackScreen(true);
      setListing(null);
      setLoading(false);
      return;
    }
    
    // Try to find an unseen listing, but limit attempts to avoid infinite loops
    let attempts = 0;
    const maxAttempts = Math.min(100, count * 2); // Reasonable limit based on count
    
    do {
      safeOffset = typeof requestedOffset === "number" 
        ? Math.max(0, Math.min(requestedOffset, count - 1))
        : Math.floor(Math.random() * count);
      attempts++;
      
      // If we've tried many times, just use the offset even if seen (better than infinite loop)
      if (attempts >= maxAttempts) break;
      
      // If we haven't seen many listings yet, don't worry about avoiding them
      if (seenIds.size < count * 0.5) break;
    } while (attempts < maxAttempts && seenIds.size > 0 && count > seenIds.size);
    
    // Final safety check: ensure offset is within bounds
    safeOffset = Math.max(0, Math.min(safeOffset, count - 1));

    // Step 3: Query listing at safe offset
    // Try common ID column name variations: "ID", "id", "listing_uuid", "uuid"
    let listingQuery = supabase
      .from("pepe_listings")
      .select("*")
      .eq("status", "Active");

    // Apply price filter if available
    if (maxPrice !== undefined && maxPrice !== null) {
      listingQuery = listingQuery.lte("monthly_rent_usd", maxPrice);
    }

    // Apply bedrooms filter if available
    if (requestedBedrooms !== null) {
      if (useBedroomsGte) {
        listingQuery = listingQuery.gte("bedrooms", requestedBedrooms);
      } else {
        listingQuery = listingQuery.eq("bedrooms", requestedBedrooms);
      }
    }

    const { data, error: qErr } = await listingQuery
      .order("listing_id", { ascending: true })
      .range(safeOffset, safeOffset);

    if (qErr) {
      setListing(null);
      setError(qErr.message);
      setLoading(false);
      return;
    }

    // Fail-safe: if count > 0 but query returns empty, check if we've seen all
    if (!qErr && (!data || data.length === 0)) {
      const currentSeenIds = getSeenListingIds();
      if (currentSeenIds.size >= count && count > 0) {
        // We've seen all available listings
        setNoMoreListings(true);
        setShowFeedbackScreen(true);
        setListing(null);
        setLoading(false);
        return;
      }
      // Otherwise, invalidate cache and try again
      setListing(null);
      setError("No Active listing found at this offset.");
      setActiveCount(null); // Invalidate cache for next manual attempt
      setLoading(false);
      return;
    }

    // Validate data structure at runtime - ensure id exists before casting
    const rawRow = data?.[0];
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
      setListing(null);
      setError("Invalid listing data: missing required ID field.");
      setLoading(false);
      return;
    }

    const r = rawRow as Record<string, unknown>;
    // Use listing_id as the primary identifier and map it to id
    const listingId = r["listing_id"] as string | undefined;
    if (!listingId || typeof listingId !== "string" || listingId.trim() === "") {
      setListing(null);
      setError("Invalid listing data: missing required listing_id field. Available columns: " + Object.keys(r).join(", "));
      setLoading(false);
      return;
    }

    // Normalize the row to always have "id" field mapped from listing_id for consistency
    const normalizedRow = { ...r, id: listingId } as Listing;
    
    // Check if we've already seen this specific listing
    if (!seenIds.has(normalizedRow.id)) {
    // Mark this listing as seen if we haven't seen it before
    addSeenListingId(normalizedRow.id);
    }
    
    setListing(normalizedRow);
    setLoading(false);
    // Trigger fade-in animation after a brief delay to ensure smooth transition
    setTimeout(() => setFadeIn(true), 50);
  }

  useEffect(() => {
    loadListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pressure = useMemo(() => (listing ? computePressure(listing) : null), [listing]);
  const tradeoffs = useMemo(
    () => (listing && pressure ? buildTradeoffs(listing, pressure.level) : null),
    [listing, pressure]
  );

  function logDecision(outcome: "apply" | "wait") {
    if (!listing) {
      return;
    }

    const currentSessionId = sessionId || getSessionId();
    const payload = {
      session_id: currentSessionId,
      step: 1,
      listing_id: listing.listing_id,
      listing_uuid: listing.id,
      outcome,
      paywall_seen: false,
      subscribed: false,
    };

    // Fire-and-forget insert - don't await to avoid blocking navigation
    void supabase.from("pepe_decision_logs").insert(payload);

    // Navigate immediately - cannot be blocked
    // Append listing_uuid to URL as source of truth
    const targetUrl = `/exit?choice=${outcome}&listing_uuid=${listing.id}`;
    window.location.assign(targetUrl);
  }

  function nextListing() {
    // Check if we've seen all listings before loading next one
    const seenIds = getSeenListingIds();
    const currentCount = activeCount;
    if (currentCount !== null && currentCount > 0 && seenIds.size >= currentCount) {
      setNoMoreListings(true);
      setShowFeedbackScreen(true);
      setListing(null);
      return;
    }
    // Reset noMoreListings state when trying to load next
    setNoMoreListings(false);
    loadListing(); // Will pick random offset within valid range
  }

  async function logFeedback(feedback: "price_too_high" | "wrong_location" | "style_not_for_me") {
    const currentSessionId = sessionId || getSessionId();
    const payload = {
      session_id: currentSessionId,
      step: 1,
      listing_id: null,
      listing_uuid: null,
      outcome: feedback as string,
      paywall_seen: false,
      subscribed: false,
    };

    // Fire-and-forget insert
    void supabase.from("pepe_decision_logs").insert(payload);
  }

  function handleFeedbackClick(feedback: "price_too_high" | "wrong_location" | "style_not_for_me") {
    logFeedback(feedback);
    // After logging, could navigate or show thank you message
    // For now, just log it
  }

  function restartSearch() {
    clearSeenListings();
    // Redirect to beginning of flow (questionnaire)
    window.location.href = "/flow";
  }

  function clearFiltersAndRestart() {
    // Clear survey answers from localStorage
    const LS_KEY = "pepe_answers_v1";
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
    clearSeenListings();
    setActiveCount(null); // Reset count cache
    setNoMoreListings(false);
    setError(null);
    // Redirect to survey to set new preferences
    window.location.href = "/flow";
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      {loading ? <div>Loading…</div> : null}

      {debugStatus ? (
        <div
          style={{
            border: "2px solid rgba(59, 130, 246, 0.5)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            background: "rgba(59, 130, 246, 0.1)",
            fontWeight: 600,
          }}
        >
          <div style={{ marginBottom: 4 }}>Debug Status:</div>
          <div>{debugStatus}</div>
        </div>
      ) : null}

      {!loading && error ? (
        <div
          style={{
            border: "1px solid rgba(220, 38, 38, 0.35)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>
        </div>
      ) : null}

      {!loading && !listing && !error && activeCount === 0 ? (
        <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ marginTop: 0, marginBottom: 16 }}>No listings match your filters</h1>
          <p style={{ fontSize: 18, marginBottom: 32, opacity: 0.8 }}>
            {hasFilters 
              ? "Try adjusting your budget or bedroom preferences to see more options."
              : "No active listings are currently available."}
          </p>
          
          {hasFilters ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={clearFiltersAndRestart}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                Update Search Preferences
              </button>
              
              <button
                onClick={() => {
                  // Clear filters but keep seen listings, reload without filters
                  const LS_KEY = "pepe_answers_v1";
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(LS_KEY);
                  }
                  setActiveCount(null);
                  setError(null);
                  loadListing();
                }}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                Show All Listings (Clear Filters)
              </button>
            </div>
          ) : (
            <button
              onClick={restartSearch}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Restart Search
            </button>
          )}
        </div>
      ) : null}

      {showFeedbackScreen ? (
        <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ marginTop: 0, marginBottom: 16 }}>
            {noMoreListings 
              ? "You've seen all available listings"
              : "We haven't found your match yet."}
          </h1>
          <p style={{ fontSize: 18, marginBottom: 32, opacity: 0.8 }}>
            {noMoreListings
              ? hasFilters
                ? "You've viewed all listings that match your current filters. Try adjusting your preferences to see more options."
                : "You've viewed all available listings. Check back later for new options."
              : "Help us refine your search."}
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => handleFeedbackClick("price_too_high")}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Price too high
            </button>
            
            <button
              onClick={() => handleFeedbackClick("wrong_location")}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Wrong location
            </button>
            
            <button
              onClick={() => handleFeedbackClick("style_not_for_me")}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Style not for me
            </button>
          </div>

          {hasFilters && noMoreListings ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={clearFiltersAndRestart}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                Update Search Preferences
              </button>
              
              <button
                onClick={() => {
                  // Clear filters but keep seen listings, reload without filters
                  const LS_KEY = "pepe_answers_v1";
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(LS_KEY);
                  }
                  setActiveCount(null);
                  setNoMoreListings(false);
                  setShowFeedbackScreen(false);
                  setError(null);
                  loadListing();
                }}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                Show All Listings (Clear Filters)
              </button>
            </div>
          ) : (
            <button
              onClick={restartSearch}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Restart Search
            </button>
          )}
        </div>
      ) : !loading && !listing ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900 }}>No Active listing found</div>
          <button
            onClick={nextListing}
            style={{
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Next listing
          </button>
        </div>
      ) : null}

      {!loading && listing ? (
        <div
          style={{
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 10, opacity: 0.8, fontSize: 12 }}>
            Listing: {listing.listing_id}
            {listing.last_checked_date ? (
              <span style={{ marginLeft: 10 }}>
                last checked: {formatDateMMDDYYYY(listing.last_checked_date)}
              </span>
            ) : null}
          </div>

          <h1 style={{ textAlign: "center", marginTop: 0 }}>
            {listing.neighborhood}, {listing.borough}
          </h1>

          <div style={{ textAlign: "center", marginBottom: 16, opacity: 0.9 }}>
            {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} • {listing.bathrooms} bath •{" "}
            {money(Number(listing.monthly_rent_usd))}/mo
          </div>

          {listing.primary_image_url ? (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <img
                src={listing.primary_image_url}
                alt="Listing"
                loading="lazy"
                style={{
                  width: "100%",
                  maxWidth: 900,
                  borderRadius: 18,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
            </div>
          ) : null}

          <div
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Curation note</div>
            <div style={{ lineHeight: 1.55 }}>{listing.curation_note}</div>

            {listing.pressure_signals ? (
              <>
                <div style={{ fontWeight: 900, marginTop: 14, marginBottom: 8 }}>Pressure signals</div>
                <div style={{ lineHeight: 1.55 }}>{listing.pressure_signals}</div>
              </>
            ) : null}

            {pressure ? (
              <div style={{ marginTop: 14, opacity: 0.9 }}>
                <b>Pressure level:</b> {pressure.level}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 360px",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Apply now</h3>
              <ul style={{ marginTop: 8, lineHeight: 1.55 }}>
                {tradeoffs?.applyNow.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logDecision("apply");
                }}
                disabled={!listing}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: listing ? "white" : "#f7f7f7",
                  cursor: listing ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  fontSize: 16,
                  opacity: listing ? 1 : 0.6,
                }}
              >
                Apply now
              </button>
            </div>

            <div
              style={{
                flex: "1 1 360px",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Wait consciously</h3>
              <ul style={{ marginTop: 8, lineHeight: 1.55 }}>
                {tradeoffs?.waitConsciously.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logDecision("wait");
                }}
                disabled={!listing}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: listing ? "white" : "#f7f7f7",
                  cursor: listing ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  fontSize: 16,
                  opacity: listing ? 1 : 0.6,
                }}
              >
                Wait consciously
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button
              onClick={nextListing}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Next listing
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
