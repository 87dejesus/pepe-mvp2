"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import { createBrowserClient } from "@supabase/ssr";
import { readAccess, hasAccess } from "@/lib/access";

const LS_KEY = "heed_answers_v2";

type Answers = {
  boroughs: string[];
  budget: number;
  bedrooms: string;
  bathrooms: string;
  pets: string;
  amenities: string[];
  timing: string;
};

export default function FlowPage() {
  const [step, setStep] = useState(1);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [boroughs, setBoroughs] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(3500);
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [pets, setPets] = useState<string>("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [timing, setTiming] = useState<string>("");

  function toggleArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  }

  function canContinue(): boolean {
    if (step === 1) return boroughs.length > 0;
    if (step === 2) return budget >= 500;
    if (step === 3) return bedrooms !== "";
    if (step === 4) return bathrooms !== "";
    if (step === 5) return pets !== "";
    if (step === 6) return true;
    if (step === 7) return timing !== "";
    return false;
  }

  function handleNext() {
    if (step < 7) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsTransitioning(false);
      }, 180);
    } else {
      const answers: Answers = { boroughs, budget, bedrooms, bathrooms, pets, amenities, timing };
      localStorage.setItem(LS_KEY, JSON.stringify(answers));
      setShowDiagnosis(true);
    }
  }

  function handleBack() {
    if (step > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsTransitioning(false);
      }, 180);
    }
  }

  useEffect(() => {
    if (!showDiagnosis) return;

    const timer = setTimeout(async () => {
      // Returning users: skip the full onboarding funnel if they already have access.
      // Fast path — check the 10-min server-verified cache (no network).
      try {
        const cached = readAccess();
        if (hasAccess(cached)) {
          // Cache says trialing or active → go straight to results
          window.location.href = "/decision";
          return;
        }

        // Slower path — check live Supabase session (handles expired cache).
        // If the user is authenticated, post-auth will re-check access-status
        // and route correctly (trialing/active → /decision, new_user → trial start).
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          window.location.href = "/onboarding/post-auth";
          return;
        }
      } catch {
        // On any error fall through to the normal new-user onboarding flow
      }

      // New (unauthenticated) user → full onboarding funnel
      window.location.href = "/onboarding/source";
    }, 3000);

    return () => clearTimeout(timer);
  }, [showDiagnosis]);

  // ── Diagnosis screen ────────────────────────────────────────────────────────
  if (showDiagnosis) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-white/[0.07] border border-white/20 rounded-2xl p-10 max-w-sm w-full text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/brand/heed-mascot.png"
                alt="Heed mascot"
                width={96}
                height={96}
                className="object-contain"
                style={{ animation: "heedPulse 2s ease-in-out infinite" }}
                unoptimized
              />
            </div>
            <div
              className="w-7 h-7 border-2 border-white/60 border-t-transparent rounded-full mx-auto mb-5"
              style={{ animation: "heedSpin 1s linear infinite" }}
            />
            <h1 className="text-lg font-semibold text-white mb-2">
              Gathering the facts…
            </h1>
            <p className="text-sm text-white/55 leading-relaxed">
              Finding the paths that minimize the usual NYC frustrations based on what you told me.
            </p>
          </div>
          <style>{`
            @keyframes heedSpin  { to { transform: rotate(360deg); } }
            @keyframes heedPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          `}</style>
        </div>
      </div>
    );
  }

  // ── Option card ─────────────────────────────────────────────────────────────
  const OptionCard = ({
    selected,
    onClick,
    children,
    type = "radio",
  }: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
    type?: "radio" | "checkbox";
  }) => (
    <div
      onClick={onClick}
      className={`flex items-center px-4 py-3.5 mb-2 rounded-xl cursor-pointer transition-all border ${
        selected
          ? "border-[#00A651]/60 bg-[#00A651]/[0.12]"
          : "border-white/20 bg-white/[0.05] hover:bg-white/[0.09]"
      }`}
    >
      <div
        className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 mr-3 transition-all ${
          type === "radio" ? "rounded-full" : "rounded"
        } ${selected ? "border-[#00A651] bg-[#00A651]" : "border-white/30"}`}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${selected ? "font-medium text-white" : "text-white/70"}`}>
        {children}
      </span>
    </div>
  );

  // ── Questions ───────────────────────────────────────────────────────────────
  const questions: Record<number, string> = {
    1: "Which boroughs work for your daily life?",
    2: "What's your monthly budget?",
    3: "How many bedrooms do you need?",
    4: "How many bathrooms do you need?",
    5: "Any pets coming along?",
    6: "Which amenities matter most to you?",
    7: "When are you planning to move?",
  };

  // ── Heed hint text ──────────────────────────────────────────────────────────
  function getHint(): { text: string; color: string } {
    if (step === 2) return { text: "got it!", color: "rgba(0,166,81,0.7)" };
    if (step === 6) return { text: "good to know!", color: "rgba(0,166,81,0.7)" };
    if (canContinue()) return { text: "solid choice!", color: "rgba(0,166,81,0.7)" };
    return { text: "waiting for your pick...", color: "rgba(255,255,255,0.25)" };
  }

  const hint = getHint();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#0A2540', overflow: 'hidden' }}>
      <Header />

      {/* Progress bar section */}
      <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Step {step} of 7</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{Math.round((step / 7) * 100)}%</span>
        </div>
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#00A651',
              borderRadius: 99,
              width: `${(step / 7) * 100}%`,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Question box */}
      <div
        style={{
          margin: '0 20px 16px',
          backgroundColor: 'white',
          borderRadius: 14,
          padding: '14px 16px',
          flexShrink: 0,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0A2540', lineHeight: 1.35, margin: 0 }}>
          {questions[step]}
        </p>
        {step === 6 && (
          <p style={{ fontSize: 11, color: 'rgba(10,37,64,0.5)', marginTop: 2, marginBottom: 0 }}>
            Select all that apply — optional
          </p>
        )}
      </div>

      {/* Options list */}
      <div
        style={{
          padding: '0 20px',
          flexShrink: 0,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {/* Step 1 — Boroughs */}
        {step === 1 && (
          <div>
            {["Manhattan", "Brooklyn", "Queens", "Bronx"].map((b) => (
              <OptionCard key={b} selected={boroughs.includes(b)} onClick={() => setBoroughs(toggleArray(boroughs, b))} type="checkbox">
                {b}
              </OptionCard>
            ))}
          </div>
        )}

        {/* Step 2 — Budget */}
        {step === 2 && (
          <div className="bg-white/[0.07] border border-white/20 rounded-xl p-5">
            <div className="text-4xl font-bold text-white text-center mb-5 tabular-nums">
              ${budget.toLocaleString()}
              <span className="text-base font-normal text-white/40 ml-1">/mo</span>
            </div>
            <input
              type="range"
              min={1000}
              max={15000}
              step={100}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full cursor-pointer accent-[#00A651]"
            />
            <div className="flex justify-between text-xs text-white/35 mt-3 font-medium">
              <span>$1,000</span>
              <span>$15,000</span>
            </div>
          </div>
        )}

        {/* Step 3 — Bedrooms */}
        {step === 3 && (
          <div>
            {[
              { value: "0", label: "Studio" },
              { value: "1", label: "1 Bedroom" },
              { value: "2", label: "2 Bedrooms" },
              { value: "3+", label: "3+ Bedrooms" },
            ].map((opt) => (
              <OptionCard key={opt.value} selected={bedrooms === opt.value} onClick={() => setBedrooms(opt.value)}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        )}

        {/* Step 4 — Bathrooms */}
        {step === 4 && (
          <div>
            {[
              { value: "1", label: "1 Bathroom" },
              { value: "1.5", label: "1.5 Bathrooms" },
              { value: "2+", label: "2+ Bathrooms" },
            ].map((opt) => (
              <OptionCard key={opt.value} selected={bathrooms === opt.value} onClick={() => setBathrooms(opt.value)}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        )}

        {/* Step 5 — Pets */}
        {step === 5 && (
          <div>
            {[
              { value: "none", label: "No pets" },
              { value: "cats", label: "Cats" },
              { value: "dogs", label: "Dogs" },
              { value: "both", label: "Cats and dogs" },
            ].map((opt) => (
              <OptionCard key={opt.value} selected={pets === opt.value} onClick={() => setPets(opt.value)}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        )}

        {/* Step 6 — Amenities */}
        {step === 6 && (
          <div>
            {[
              { value: "washer_dryer", label: "Washer/dryer in unit" },
              { value: "elevator", label: "Elevator" },
              { value: "doorman", label: "Doorman" },
              { value: "gym", label: "Gym" },
            ].map((opt) => (
              <OptionCard key={opt.value} selected={amenities.includes(opt.value)} onClick={() => setAmenities(toggleArray(amenities, opt.value))} type="checkbox">
                {opt.label}
              </OptionCard>
            ))}
          </div>
        )}

        {/* Step 7 — Timing */}
        {step === 7 && (
          <div>
            {[
              { value: "asap", label: "ASAP — I need to move soon" },
              { value: "30days", label: "Within 30 days" },
              { value: "researching", label: "Just researching for now" },
            ].map((opt) => (
              <OptionCard key={opt.value} selected={timing === opt.value} onClick={() => setTiming(opt.value)}>
                {opt.label}
              </OptionCard>
            ))}
          </div>
        )}
      </div>

      {/* Heed area — fills remaining space */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 0',
        }}
      >
        <Image
          src="/brand/heed-mascot.png"
          alt="Heed mascot"
          width={72}
          height={72}
          className="object-contain"
          unoptimized
        />
        <span style={{ fontSize: 12, color: hint.color, transition: 'color 0.2s' }}>
          {hint.text}
        </span>
      </div>

      {/* Bottom button area */}
      <div style={{ padding: '8px 20px 28px', flexShrink: 0, backgroundColor: '#0A2540' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{
                width: 'auto',
                paddingLeft: 16,
                paddingRight: 16,
                height: 52,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: canContinue() ? 'pointer' : 'not-allowed',
              backgroundColor: canContinue() ? '#00A651' : 'rgba(255,255,255,0.07)',
              color: canContinue() ? 'white' : 'rgba(255,255,255,0.25)',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            {step === 7 ? "Find My Match" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
