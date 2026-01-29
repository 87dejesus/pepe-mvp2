"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

const LS_KEY = "pepe_answers_v2";

type Answers = {
  boroughs: string[];
  budget: number;
  bedrooms: string;
  bathrooms: string;
  pets: string;
  amenities: string[];
  timing: string;
};

type Listing = {
  id: string;
  borough: string;
  neighborhood: string | null;
  price: number;
  bedrooms: number;
  bathrooms: number;
  pets: string | null;
  image_url: string | null;
  original_url: string | null;
  description: string | null;
  vibe_keywords: string[] | null;
  address: string | null;
  freshness_score: number | null;
};

type MatchType = "perfect" | "partial" | null;

const INSPIRATIONAL_PHRASES = [
  "Wait consciously...",
  "Your perfect home is out there",
  "Good things take time",
  "Breathe. Trust the process.",
  "Finding your sanctuary...",
  "Every journey begins with patience",
  "Your next chapter awaits",
];

const MIN_LOADING_TIME = 3500; // 3.5 seconds minimum

type MarketActivity = {
  level: "high" | "steady" | "peaceful";
  label: string;
  reason: string;
  color: string;
  bgColor: string;
};

function getMarketActivity(listing: Listing, userBudget: number): MarketActivity {
  const freshness = listing.freshness_score || 50;
  const priceRatio = listing.price / userBudget;
  const neighborhood = listing.neighborhood || listing.borough;

  // High Activity: Very fresh (80+) or significantly under budget (< 70% of budget)
  if (freshness >= 80) {
    return {
      level: "high",
      label: "High Activity",
      reason: "Listed less than 24h ago.",
      color: "#c2410c",
      bgColor: "#fff7ed"
    };
  }

  if (priceRatio < 0.7) {
    return {
      level: "high",
      label: "High Activity",
      reason: `Priced 30%+ below your budget.`,
      color: "#c2410c",
      bgColor: "#fff7ed"
    };
  }

  // Steady Market: Medium freshness (40-79) or standard pricing
  if (freshness >= 40 && freshness < 80) {
    if (priceRatio >= 0.85 && priceRatio <= 1.0) {
      return {
        level: "steady",
        label: "Steady Market",
        reason: `Standard pricing for ${neighborhood}.`,
        color: "#1d4ed8",
        bgColor: "#eff6ff"
      };
    }
    return {
      level: "steady",
      label: "Steady Market",
      reason: "Available for 3+ days.",
      color: "#1d4ed8",
      bgColor: "#eff6ff"
    };
  }

  // Peaceful Pace: Low freshness (< 40) or premium pricing
  if (priceRatio > 0.95) {
    return {
      level: "peaceful",
      label: "Peaceful Pace",
      reason: "Premium pricing tier.",
      color: "#166534",
      bgColor: "#f0fdf4"
    };
  }

  return {
    level: "peaceful",
    label: "Peaceful Pace",
    reason: "On market for 7+ days.",
    color: "#166534",
    bgColor: "#f0fdf4"
  };
}

export default function DecisionPage() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"intro" | "loading" | "listing" | "no-results" | "zen-farewell">("intro");
  const [listing, setListing] = useState<Listing | null>(null);
  const [matchType, setMatchType] = useState<MatchType>(null);
  const [error, setError] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [hasAnswers, setHasAnswers] = useState<boolean | null>(null);
  const [debugMessage, setDebugMessage] = useState<string>("");
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LS_KEY);
    setHasAnswers(!!stored);
  }, []);

  // Rotate through inspirational phrases during loading
  useEffect(() => {
    if (view !== "loading") return;

    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % INSPIRATIONAL_PHRASES.length);
    }, 1200); // Change phrase every 1.2 seconds

    return () => clearInterval(interval);
  }, [view]);

  function getAnswers(): Answers | null {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as Answers;
    } catch {
      return null;
    }
  }

  function buildBedroomFilter(bedrooms: string): { eq?: number; gte?: number } {
    if (bedrooms === "0") return { eq: 0 };
    if (bedrooms === "1") return { eq: 1 };
    if (bedrooms === "2") return { eq: 2 };
    if (bedrooms === "3+") return { gte: 3 };
    return {};
  }

  function matchesPetRequirement(listingPets: string | null, userPets: string): boolean {
    if (userPets === "none") return true;
    if (!listingPets) return true;

    const petsLower = listingPets.toLowerCase();
    if (petsLower.includes("no pets") || petsLower === "none") {
      return userPets === "none";
    }
    return true;
  }

  async function handleFindListings() {
    setView("loading");
    setCurrentPhrase(0);
    setError(null);
    setDebugMessage("");

    const startTime = Date.now();

    const answers = getAnswers();
    if (!answers) {
      setError("No preferences found. Please complete the questionnaire first.");
      setView("intro");
      return;
    }

    // DEBUG: Log query parameters
    console.log('Query Params:', {
      boroughs: answers.boroughs,
      budget: answers.budget,
      bedrooms: answers.bedrooms,
      bathrooms: answers.bathrooms,
      pets: answers.pets
    });

    // Helper to ensure minimum loading time
    const showResultAfterDelay = async (callback: () => void) => {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_LOADING_TIME - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      callback();
    };

    try {
      const bedroomFilter = buildBedroomFilter(answers.bedrooms);

      // DEBUG: Log exact query being sent to Supabase
      const boroughsLower = answers.boroughs.map((b: string) => b.toLowerCase());
      console.log('Query enviada para o Supabase:', {
        boroughs_original: answers.boroughs,
        boroughs_lowercase: boroughsLower,
        budget: answers.budget,
        bedrooms: bedroomFilter
      });

      // Build case-insensitive borough filter using OR with ilike
      const boroughFilter = answers.boroughs
        .map((b: string) => `borough.ilike.${b}`)
        .join(',');

      let query = supabase
        .from("listings")
        .select("*")
        // .eq("status", "Active")  // TEMPORARILY DISABLED FOR DEBUG
        .or(boroughFilter)
        .lte("price", answers.budget);

      if (bedroomFilter.eq !== undefined) {
        query = query.eq("bedrooms", bedroomFilter.eq);
      } else if (bedroomFilter.gte !== undefined) {
        query = query.gte("bedrooms", bedroomFilter.gte);
      }

      if (answers.bathrooms === "1") {
        query = query.gte("bathrooms", 1);
      } else if (answers.bathrooms === "1.5") {
        query = query.gte("bathrooms", 1.5);
      } else if (answers.bathrooms === "2+") {
        query = query.gte("bathrooms", 2);
      }

      const { data: perfectMatches, error: err1 } = await query;

      // DEBUG: Log results from perfect match query
      console.log('Results Found (Perfect Match):', perfectMatches?.length || 0);
      console.log('Perfect Match Data:', perfectMatches);

      if (err1) {
        setError(err1.message);
        setDebugMessage(`Query error: ${err1.message}`);
        setView("intro");
        return;
      }

      const unseenPerfect = (perfectMatches || []).filter(
        (l) => !seenIds.has(l.id) && matchesPetRequirement(l.pets, answers.pets)
      );

      if (unseenPerfect.length > 0) {
        const randomIndex = Math.floor(Math.random() * unseenPerfect.length);
        const row = unseenPerfect[randomIndex];

        await showResultAfterDelay(() => {
          setSeenIds((prev) => new Set([...prev, row.id]));
          setListing(row);
          setMatchType("perfect");
          setView("listing");
        });
        return;
      }

      // Fallback: Borough + Budget only
      const partialQuery = supabase
        .from("listings")
        .select("*")
        // .eq("status", "Active")  // TEMPORARILY DISABLED FOR DEBUG
        .or(boroughFilter)
        .lte("price", answers.budget);

      const { data: partialMatches, error: err2 } = await partialQuery;

      // DEBUG: Log results from partial match query
      console.log('Results Found (Partial Match):', partialMatches?.length || 0);
      console.log('Partial Match Data:', partialMatches);

      if (err2) {
        setError(err2.message);
        setView("intro");
        return;
      }

      const unseenPartial = (partialMatches || []).filter(
        (l) => !seenIds.has(l.id) && matchesPetRequirement(l.pets, answers.pets)
      );

      if (unseenPartial.length > 0) {
        const randomIndex = Math.floor(Math.random() * unseenPartial.length);
        const row = unseenPartial[randomIndex];

        await showResultAfterDelay(() => {
          setSeenIds((prev) => new Set([...prev, row.id]));
          setListing(row);
          setMatchType("partial");
          setView("listing");
        });
        return;
      }

      await showResultAfterDelay(() => {
        setDebugMessage(
          `Filters: Boroughs=[${answers.boroughs.join(", ")}], Budget=$${answers.budget}, Bedrooms=${answers.bedrooms}\n` +
          `DB returned: ${perfectMatches?.length || 0} perfect, ${partialMatches?.length || 0} partial matches.`
        );
        setView("no-results");
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error occurred.";
      setError(errorMessage);
      setView("intro");
    }
  }

  function handleNextListing() {
    handleFindListings();
  }

  function handleApply() {
    if (listing?.original_url) {
      window.open(listing.original_url, "_blank");
    }
  }

  function handleRestartFlow() {
    localStorage.removeItem(LS_KEY);
    window.location.href = "/flow";
  }

  if (!mounted) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center", background: "#FDFCF8", minHeight: "100vh" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #059669", borderTopColor: "transparent", borderRadius: "50%", margin: "40px auto 24px", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (hasAnswers === false) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center", background: "#FDFCF8", minHeight: "100vh" }}>
        <Image src="/logo-v2.png" alt="Pepe" width={100} height={100} className="mx-auto" style={{ objectFit: "contain", marginTop: 40, marginBottom: 24 }} unoptimized />
        <h1 style={{ marginBottom: 16, color: "#27272a" }}>Let&apos;s Get Started</h1>
        <p style={{ fontSize: 18, marginBottom: 32, color: "#52525b", lineHeight: 1.6 }}>Tell us what you&apos;re looking for so we can find the perfect place for you.</p>
        <button onClick={() => (window.location.href = "/flow")} style={{ width: "100%", padding: "16px 24px", borderRadius: 14, border: "none", background: "#059669", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 18 }}>
          Start Questionnaire
        </button>
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center", background: "#FDFCF8", minHeight: "100vh" }}>
        <Image src="/logo-v2.png" alt="Pepe" width={100} height={100} className="mx-auto" style={{ objectFit: "contain", marginTop: 40, marginBottom: 24 }} unoptimized />
        <h1 style={{ marginBottom: 16, color: "#27272a" }}>Ready to Find Your Place?</h1>
        <p style={{ fontSize: 18, marginBottom: 32, color: "#52525b", lineHeight: 1.6 }}>We&apos;ll show you curated NYC listings one at a time, filtered by your non-negotiables.</p>
        {error && <div style={{ color: "#dc2626", marginBottom: 16, padding: 12, background: "#fef2f2", borderRadius: 8 }}>{error}</div>}
        <button onClick={handleFindListings} style={{ width: "100%", padding: "16px 24px", borderRadius: 14, border: "none", background: "#059669", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          Find Listings
        </button>
        <button onClick={() => (window.location.href = "/flow")} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 16, color: "#27272a" }}>
          Update My Preferences
        </button>
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div style={{
        padding: 24,
        maxWidth: 600,
        margin: "0 auto",
        textAlign: "center",
        background: "#FDFCF8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <Image
          src="/logo-v2.png"
          alt="Pepe"
          width={80}
          height={80}
          style={{ objectFit: "contain", marginBottom: 32, opacity: 0.9 }}
          unoptimized
        />

        <div style={{
          width: 56,
          height: 56,
          border: "3px solid #e5e7eb",
          borderTopColor: "#059669",
          borderRadius: "50%",
          marginBottom: 32,
          animation: "spin 1s linear infinite"
        }} />

        <h1 style={{
          fontSize: 28,
          color: "#27272a",
          marginBottom: 16,
          fontWeight: 600,
          animation: "fadeIn 0.5s ease-in-out"
        }}>
          {INSPIRATIONAL_PHRASES[currentPhrase]}
        </h1>

        <p style={{
          color: "#71717a",
          fontSize: 16,
          maxWidth: 300,
          lineHeight: 1.6
        }}>
          Curating the best options for your peace of mind...
        </p>

        <div style={{
          display: "flex",
          gap: 8,
          marginTop: 40,
          justifyContent: "center"
        }}>
          {INSPIRATIONAL_PHRASES.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === currentPhrase ? "#059669" : "#e5e7eb",
                transition: "background 0.3s ease"
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  if (view === "no-results") {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", textAlign: "center", background: "#FDFCF8", minHeight: "100vh" }}>
        <Image src="/logo-v2.png" alt="Pepe" width={80} height={80} className="mx-auto" style={{ objectFit: "contain", marginTop: 40, marginBottom: 16 }} unoptimized />
        <h1 style={{ marginBottom: 16, color: "#27272a" }}>No Matches Found</h1>
        <p style={{ fontSize: 18, marginBottom: 24, color: "#52525b", lineHeight: 1.6 }}>We couldn&apos;t find any listings that match your criteria.</p>
        {debugMessage && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 16, marginBottom: 24, textAlign: "left", fontSize: 13, color: "#92400e", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            <strong>Debug:</strong><br />{debugMessage}
          </div>
        )}
        <button onClick={handleRestartFlow} style={{ width: "100%", padding: "16px 24px", borderRadius: 14, border: "none", background: "#059669", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          Update My Preferences
        </button>
        <button onClick={() => { setSeenIds(new Set()); handleFindListings(); }} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 16, color: "#27272a" }}>
          Start Over
        </button>
      </div>
    );
  }

  if (view === "zen-farewell") {
    return (
      <div style={{
        padding: 24,
        maxWidth: 600,
        margin: "0 auto",
        textAlign: "center",
        background: "#FDFCF8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <Image
          src="/logo-v2.png"
          alt="Pepe"
          width={100}
          height={100}
          style={{ objectFit: "contain", marginBottom: 32, opacity: 0.9 }}
          unoptimized
        />

        <h1 style={{
          fontSize: 28,
          color: "#27272a",
          marginBottom: 16,
          fontWeight: 600
        }}>
          You Made the Right Choice
        </h1>

        <p style={{
          color: "#52525b",
          fontSize: 18,
          maxWidth: 400,
          lineHeight: 1.7,
          marginBottom: 8
        }}>
          Taking a pause is a sign of wisdom, not weakness.
        </p>

        <p style={{
          color: "#71717a",
          fontSize: 16,
          maxWidth: 380,
          lineHeight: 1.6,
          marginBottom: 40
        }}>
          Your perfect home will still be here when you&apos;re ready.
          Trust your timing.
        </p>

        <div style={{
          padding: 20,
          background: "#f0fdf4",
          borderRadius: 16,
          border: "1px solid rgba(5, 150, 105, 0.2)",
          marginBottom: 32,
          maxWidth: 360
        }}>
          <p style={{
            margin: 0,
            fontSize: 15,
            color: "#166534",
            fontStyle: "italic",
            lineHeight: 1.6
          }}>
            &ldquo;The best decisions come from a place of peace, not pressure.&rdquo;
          </p>
        </div>

        <button
          onClick={() => window.location.href = "/"}
          style={{
            width: "100%",
            maxWidth: 300,
            padding: "16px 24px",
            borderRadius: 14,
            border: "none",
            background: "#059669",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 12
          }}
        >
          Return Home
        </button>

        <button
          onClick={() => setView("intro")}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 15,
            color: "#71717a"
          }}
        >
          I&apos;m ready to continue
        </button>
      </div>
    );
  }

  if (view === "listing" && listing) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", background: "#FDFCF8", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          {matchType === "perfect" ? (
            <div style={{ display: "inline-block", padding: "10px 20px", background: "#dcfce7", color: "#166534", borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
              Perfect Match for your Peace of Mind
            </div>
          ) : (
            <div style={{ display: "inline-block", padding: "10px 20px", background: "#fef3c7", color: "#92400e", borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
              Close match - fits your main criteria
            </div>
          )}
        </div>

        <h1 style={{ textAlign: "center", marginTop: 0, marginBottom: 8, color: "#27272a" }}>
          {listing.neighborhood}, {listing.borough}
        </h1>

        {listing.address && (
          <div style={{ textAlign: "center", marginBottom: 8, color: "#71717a", fontSize: 14 }}>
            {listing.address}
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 16, color: "#52525b", fontSize: 18 }}>
          {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`} &bull; {listing.bathrooms} bath &bull; <strong>${listing.price.toLocaleString()}/mo</strong>
        </div>

        {/* Market Activity Indicator */}
        {(() => {
          const answers = getAnswers();
          const activity = getMarketActivity(listing, answers?.budget || listing.price);
          return (
            <div style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 20
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: activity.bgColor,
                borderRadius: 12,
                border: `1px solid ${activity.color}20`
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: activity.color,
                  opacity: activity.level === "high" ? 1 : 0.7
                }} />
                <div>
                  <span style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: activity.color
                  }}>
                    {activity.label}
                  </span>
                  <span style={{
                    marginLeft: 8,
                    fontSize: 13,
                    color: "#71717a"
                  }}>
                    {activity.reason}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {listing.image_url && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img src={listing.image_url} alt="Listing" style={{ width: "100%", maxWidth: 800, borderRadius: 16, border: "1px solid rgba(0,0,0,0.1)" }} />
          </div>
        )}

        {listing.description && (
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16, marginBottom: 20, background: "white" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#27272a" }}>About This Place</div>
            <div style={{ lineHeight: 1.6, color: "#52525b" }}>{listing.description}</div>
          </div>
        )}

        {listing.vibe_keywords && listing.vibe_keywords.length > 0 && (
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16, marginBottom: 20, background: "#f0fdf4" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#166534" }}>Vibe</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {listing.vibe_keywords.map((keyword, i) => (
                <span key={i} style={{ padding: "4px 12px", background: "#dcfce7", borderRadius: 12, fontSize: 14, color: "#166534" }}>{keyword}</span>
              ))}
            </div>
          </div>
        )}


        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 16, marginBottom: 20, background: "white" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><strong>Pets:</strong> {listing.pets || "Ask landlord"}</div>
            <div><strong>Bedrooms:</strong> {listing.bedrooms === 0 ? "Studio" : listing.bedrooms}</div>
            <div><strong>Bathrooms:</strong> {listing.bathrooms}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={handleApply} style={{ flex: 1, minWidth: 200, padding: "14px 20px", borderRadius: 12, border: "none", background: "#059669", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>
            View Listing
          </button>
          <button onClick={handleNextListing} style={{ flex: 1, minWidth: 200, padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)", background: "white", cursor: "pointer", fontWeight: 700, fontSize: 16, color: "#27272a" }}>
            Next Listing
          </button>
        </div>

        {/* Wait Consciously Section */}
        <div style={{
          marginTop: 32,
          padding: 20,
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
          borderRadius: 16,
          border: "1px solid rgba(5, 150, 105, 0.15)",
          textAlign: "center"
        }}>
          <button
            onClick={() => setView("zen-farewell")}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "1px solid rgba(5, 150, 105, 0.3)",
              background: "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
              color: "#059669",
              marginBottom: 12,
              transition: "all 0.2s ease"
            }}
          >
            Wait Consciously
          </button>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: "#52525b",
            lineHeight: 1.5,
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto"
          }}>
            Feeling unsure? It&apos;s better to stop here and come back with clarity later.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => setView("intro")} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#71717a", fontSize: 14 }}>
            Back to Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, textAlign: "center", background: "#FDFCF8", minHeight: "100vh" }}>
      <p style={{ color: "#27272a" }}>Something went wrong. Please refresh the page.</p>
    </div>
  );
}
