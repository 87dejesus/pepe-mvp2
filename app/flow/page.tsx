"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  housingType?: string;     // 'whole' | 'shared' | 'both'
  upfrontCash?: string;     // '<5k' | '5-10k' | '10-15k' | '15k+' | 'unsure'
  qualification?: string;   // 'income40x' | 'guarantor' | 'service' | 'lowbarrier'
};

const NAVY = "#0A2540";
const DEEP = "#071b30";
const GREEN = "#00A651";
const LINE = "rgba(255,255,255,.14)";
const SERIF = 'var(--font-caslon), Georgia, serif';

const TOTAL = 7;

export default function FlowPage() {
  const [step, setStep] = useState(1);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [fade, setFade] = useState(false);

  const [boroughs, setBoroughs] = useState<string[]>([]);
  const [housingType, setHousingType] = useState<string>("");
  const [budget, setBudget] = useState<number>(2800);
  const [upfrontCash, setUpfrontCash] = useState<string>("");
  const [qualification, setQualification] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [pets, setPets] = useState<string>("");

  // Prefill from a previous session so "Start a new search" lets the user
  // tweak their answers instead of redoing the quiz from scratch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydrate from a prior session, not a render-driven sync */
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Answers>;
      if (Array.isArray(saved.boroughs)) setBoroughs(saved.boroughs);
      if (typeof saved.housingType === "string") setHousingType(saved.housingType);
      if (typeof saved.budget === "number") setBudget(saved.budget);
      if (typeof saved.upfrontCash === "string") setUpfrontCash(saved.upfrontCash);
      if (typeof saved.qualification === "string") setQualification(saved.qualification);
      if (typeof saved.bedrooms === "string") setBedrooms(saved.bedrooms);
      if (typeof saved.pets === "string") setPets(saved.pets);
    } catch {
      // ignore malformed cache
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function toggleArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  }

  function canContinue(): boolean {
    if (step === 1) return boroughs.length > 0;
    if (step === 2) return housingType !== "";
    if (step === 3) return budget >= 500;
    if (step === 4) return upfrontCash !== "";
    if (step === 5) return qualification !== "";
    if (step === 6) return bedrooms !== "";
    if (step === 7) return pets !== "";
    return false;
  }

  function go(next: number) {
    setFade(true);
    setTimeout(() => {
      setStep(next);
      setFade(false);
    }, 170);
  }

  function handleNext() {
    if (step < TOTAL) {
      go(step + 1);
    } else {
      const answers: Answers = {
        boroughs,
        budget,
        bedrooms,
        pets,
        bathrooms: "1",          // retired from the quiz; kept for back-compat
        amenities: [],           // retired from the quiz
        timing: "researching",   // retired from the quiz
        housingType,
        upfrontCash,
        qualification,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(answers));
      setShowDiagnosis(true);
    }
  }

  function handleBack() {
    if (step > 1) go(step - 1);
  }

  useEffect(() => {
    if (!showDiagnosis) return;
    const timer = setTimeout(async () => {
      try {
        const cached = readAccess();
        if (hasAccess(cached)) {
          window.location.href = "/decision";
          return;
        }
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
        // fall through to new-user onboarding
      }
      window.location.href = "/onboarding/preview";
    }, 3000);
    return () => clearTimeout(timer);
  }, [showDiagnosis]);

  // ── Diagnosis screen ────────────────────────────────────────────────────────
  if (showDiagnosis) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: NAVY, padding: 24, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <Image src="/brand/heed-mascot.png" alt="Heed" width={96} height={96} className="object-contain" style={{ marginBottom: 22, animation: "heedPulse 2s ease-in-out infinite" }} unoptimized />
        <div style={{ width: 28, height: 28, border: "2px solid rgba(255,255,255,.5)", borderTopColor: "transparent", borderRadius: "999px", marginBottom: 20, animation: "heedSpin 1s linear infinite" }} />
        <h1 style={{ fontFamily: SERIF, color: "#fff", fontSize: 24, fontWeight: 400, marginBottom: 8, textAlign: "center" }}>Reading the fine print.</h1>
        <p style={{ color: "rgba(255,255,255,.55)", fontSize: 14, lineHeight: 1.5, textAlign: "center", maxWidth: 300 }}>Lining up places against your lines, and checking what each one hides.</p>
        <style>{`@keyframes heedSpin{to{transform:rotate(360deg)}}@keyframes heedPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      </div>
    );
  }

  // ── Option card ─────────────────────────────────────────────────────────────
  const Opt = ({ selected, onClick, type = "radio", title, desc, meta }: { selected: boolean; onClick: () => void; type?: "radio" | "checkbox"; title: string; desc?: string; meta?: string }) => (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 15px", borderRadius: 13, cursor: "pointer", border: `1px solid ${selected ? "rgba(0,166,81,.6)" : LINE}`, background: selected ? "rgba(0,166,81,.12)" : "rgba(255,255,255,.04)", transition: "all .15s" }}
    >
      <span style={{ width: 22, height: 22, flex: "none", marginTop: 1, borderRadius: type === "radio" ? "999px" : 7, border: `2px solid ${selected ? GREEN : "rgba(255,255,255,.3)"}`, background: selected ? GREEN : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {selected && (
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: selected ? "#fff" : "rgba(255,255,255,.74)" }}>{title}</div>
        {desc && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      {meta && <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap", paddingLeft: 8 }}>{meta}</span>}
    </div>
  );

  const KICKER: Record<number, string> = {
    1: "Clause I · Where", 2: "Clause II · Your space", 3: "Clause III · Budget",
    4: "Clause IV · Move-in cash", 5: "Clause V · The money reality", 6: "Clause VI · Room", 7: "Clause VII · Pets",
  };
  const QUESTION: Record<number, string> = {
    1: "Which boroughs work for your life?",
    2: "A place of your own, or open to sharing?",
    3: "What's the most you'd pay a month?",
    4: "How much cash can you put toward move-in?",
    5: "Can you clear the income bar?",
    6: "How much room is non-negotiable?",
    7: "Any pets coming with you?",
  };
  const HINT: Record<number, string> = {
    2: "In NYC this changes everything about price and privacy.",
    3: "Pick your ceiling. We won't push you past it.",
    4: "Real NYC move-in runs first month + one month deposit, sometimes more.",
    5: "No judgment. There's a path for every situation, and we'll be honest about each place.",
    6: "Pick the smallest you'd accept.",
  };

  // ── Your lines (the contract) ───────────────────────────────────────────────
  const lines: { k: string; v: string }[] = [];
  if (boroughs.length) lines.push({ k: "Where", v: boroughs.join(", ") });
  if (housingType) lines.push({ k: "Home type", v: housingType === "whole" ? "A place of my own" : housingType === "shared" ? "Open to sharing" : "Show me both" });
  if (step > 3) lines.push({ k: "Budget", v: `Up to $${budget.toLocaleString()}/mo` });
  if (upfrontCash) lines.push({ k: "Move-in cash", v: ({ "<5k": "Under $5k", "5-10k": "$5-10k", "10-15k": "$10-15k", "15k+": "$15k+", unsure: "Not sure yet" } as Record<string, string>)[upfrontCash] });
  if (qualification) lines.push({ k: "Qualify", v: ({ income40x: "Income clears 40x", guarantor: "Personal guarantor", service: "Guarantor service", lowbarrier: "Low-barrier options" } as Record<string, string>)[qualification] });
  if (bedrooms) lines.push({ k: "Room", v: ({ "0": "Studio", "1": "1 bed", "2": "2 beds", "3+": "3+ beds" } as Record<string, string>)[bedrooms] });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: NAVY, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* masthead + progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px 11px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/brand/heed-mascot.png" alt="Heed" width={20} height={26} style={{ height: 26, width: "auto" }} unoptimized />
          <span style={{ fontFamily: SERIF, color: "#fff", fontSize: 15 }}>The Steady One</span>
        </div>
        <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: GREEN, fontWeight: 700 }}>Your terms · {step} of {TOTAL}</span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,.12)", margin: "0 20px" }}>
        <div style={{ height: "100%", width: `${(step / TOTAL) * 100}%`, background: GREEN, borderRadius: 99, transition: "width .3s" }} />
      </div>

      {/* question */}
      <div style={{ padding: "24px 22px 4px", opacity: fade ? 0 : 1, transition: "opacity .17s" }}>
        <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 11 }}>{KICKER[step]}</div>
        <h1 style={{ fontFamily: SERIF, color: "#fff", fontSize: 27, lineHeight: 1.1, fontWeight: 400 }}>{QUESTION[step]}</h1>
        {HINT[step] && <p style={{ color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 9, lineHeight: 1.5 }}>{HINT[step]}</p>}
      </div>

      {/* options */}
      <div style={{ padding: "14px 22px 6px", display: "flex", flexDirection: "column", gap: 9, opacity: fade ? 0 : 1, transition: "opacity .17s" }}>
        {step === 1 && ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map((b) => (
          <Opt key={b} type="checkbox" selected={boroughs.includes(b)} onClick={() => setBoroughs(toggleArray(boroughs, b))} title={b} />
        ))}
        {step === 2 && (
          <>
            <Opt selected={housingType === "whole"} onClick={() => setHousingType("whole")} title="A whole place to myself" desc="Studio or apartment, your name on the lease." />
            <Opt selected={housingType === "shared"} onClick={() => setHousingType("shared")} title="Open to a room in a shared place" desc="A private room; co-living and shared apartments included." />
            <Opt selected={housingType === "both"} onClick={() => setHousingType("both")} title="Show me both" desc="I'll weigh the tradeoffs myself." />
          </>
        )}
        {step === 3 && (
          <div style={{ background: "rgba(255,255,255,.05)", border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: SERIF, color: "#fff", fontSize: 34, textAlign: "center", marginBottom: 14 }}>${budget.toLocaleString()}<span style={{ fontFamily: "var(--font-inter)", fontSize: 15, color: "rgba(255,255,255,.4)", marginLeft: 4 }}>/mo</span></div>
            <input type="range" min={1000} max={10000} step={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: GREEN }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 8 }}><span>$1,000</span><span>$10,000+</span></div>
          </div>
        )}
        {step === 4 && (
          <>
            <Opt selected={upfrontCash === "<5k"} onClick={() => setUpfrontCash("<5k")} title="Under $5,000" />
            <Opt selected={upfrontCash === "5-10k"} onClick={() => setUpfrontCash("5-10k")} title="$5,000 - $10,000" />
            <Opt selected={upfrontCash === "10-15k"} onClick={() => setUpfrontCash("10-15k")} title="$10,000 - $15,000" />
            <Opt selected={upfrontCash === "15k+"} onClick={() => setUpfrontCash("15k+")} title="More than $15,000" />
            <Opt selected={upfrontCash === "unsure"} onClick={() => setUpfrontCash("unsure")} title="Not sure yet" desc="We'll show the real number on each place." />
          </>
        )}
        {step === 5 && (
          <>
            <Opt selected={qualification === "income40x"} onClick={() => setQualification("income40x")} title="My income clears about 40x the rent" desc="e.g. ~$120k/yr for a $3,000 place." />
            <Opt selected={qualification === "guarantor"} onClick={() => setQualification("guarantor")} title="I'll use a personal guarantor" desc="A family member or friend who earns ~80x." />
            <Opt selected={qualification === "service"} onClick={() => setQualification("service")} title="I'll use a guarantor service" desc="Insurent / TheGuarantors, qualify at ~27.5x." />
            <Opt selected={qualification === "lowbarrier"} onClick={() => setQualification("lowbarrier")} title="Not sure, show low-barrier options" desc="Co-living and buildings that skip the income test." />
          </>
        )}
        {step === 6 && [
          { v: "0", t: "Studio" }, { v: "1", t: "1 bedroom" }, { v: "2", t: "2 bedrooms" }, { v: "3+", t: "3+ bedrooms" },
        ].map((o) => (
          <Opt key={o.v} selected={bedrooms === o.v} onClick={() => setBedrooms(o.v)} title={o.t} />
        ))}
        {step === 7 && [
          { v: "none", t: "No pets" }, { v: "cats", t: "Cats" }, { v: "dogs", t: "Dogs" }, { v: "both", t: "Cats and dogs" },
        ].map((o) => (
          <Opt key={o.v} selected={pets === o.v} onClick={() => setPets(o.v)} title={o.t} />
        ))}
      </div>

      {/* your lines */}
      {lines.length > 0 && (
        <div style={{ margin: "14px 22px 0", padding: "13px 16px", background: "rgba(255,255,255,.04)", border: `1px solid ${LINE}`, borderRadius: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.42)", fontWeight: 700, marginBottom: 10, display: "flex", gap: 8 }}><span style={{ color: GREEN }}>§</span> Your lines so far</div>
          {lines.map((l) => (
            <div key={l.k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,.07)` }}>
              <span style={{ width: 16, height: 16, borderRadius: "999px", background: GREEN, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>✓</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".05em", width: 92, flex: "none" }}>{l.k}</span>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{l.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* dock */}
      <div style={{ marginTop: "auto", padding: "16px 22px 24px", borderTop: `1px solid ${LINE}`, background: DEEP }}>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 1 && (
            <button onClick={handleBack} style={{ width: 52, height: 54, borderRadius: 13, background: "rgba(255,255,255,.06)", border: `1px solid ${LINE}`, color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 18 }}>←</button>
          )}
          <button onClick={handleNext} disabled={!canContinue()} style={{ flex: 1, height: 54, borderRadius: 13, fontWeight: 700, fontSize: 16, border: "none", cursor: canContinue() ? "pointer" : "not-allowed", background: canContinue() ? GREEN : "rgba(255,255,255,.07)", color: canContinue() ? "#fff" : "rgba(255,255,255,.25)", transition: "all .2s" }}>
            {step === TOTAL ? "See my matches →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
