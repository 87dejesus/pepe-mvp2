"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Answers = {
  boroughs: string[];
  budgetMax: number;
  beds: "0" | "1" | "2" | "3+";
  moveWhen: "now" | "2-4w" | "1-2m" | "flex";
  commuteNote: string;
  dealbreakers: string[];
};

const LS_KEY = "pepe_answers_v1";

export default function FlowPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [boroughs, setBoroughs] = useState<string[]>(["Manhattan"]);
  const [budgetMax, setBudgetMax] = useState<number>(3200);
  const [beds, setBeds] = useState<Answers["beds"]>("1");
  const [moveWhen, setMoveWhen] = useState<Answers["moveWhen"]>("now");
  const [commuteNote, setCommuteNote] = useState<string>("");
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  const canContinue = useMemo(() => {
    if (step === 1) return boroughs.length > 0;
    if (step === 2) return budgetMax >= 1000;
    if (step === 3) return !!beds;
    if (step === 4) return !!moveWhen;
    if (step === 5) return commuteNote.trim().length >= 10; // obrigatória no MVP
    return true;
  }, [step, boroughs, budgetMax, beds, moveWhen, commuteNote]);

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function saveAndGo() {
    const payload: Answers = {
      boroughs,
      budgetMax,
      beds,
      moveWhen,
      commuteNote: commuteNote.trim(),
      dealbreakers,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    router.push("/decision");
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Flow</h1>
      <p>Answer fast. We only ask what changes the decision.</p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        {step === 1 && (
          <>
            <h2>Where are you willing to live?</h2>
            <p>Select boroughs. Keep it honest.</p>
            {["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map((b) => (
              <label key={b} style={{ display: "block", marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={boroughs.includes(b)}
                  onChange={() => setBoroughs(toggle(boroughs, b))}
                />{" "}
                {b}
              </label>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <h2>Max monthly budget</h2>
            <p>NYC pressure is real. We need the hard ceiling.</p>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              style={{ marginTop: 8, padding: 8, width: 220 }}
              min={500}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h2>Bedrooms</h2>
            {(["0", "1", "2", "3+"] as const).map((v) => (
              <label key={v} style={{ display: "block", marginTop: 8 }}>
                <input type="radio" checked={beds === v} onChange={() => setBeds(v)} /> {v}
              </label>
            ))}
            <p style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
              Studio is 0. This will matter in tradeoffs.
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <h2>How soon do you need to move?</h2>
            {[
              { v: "now", t: "Now (days)" },
              { v: "2-4w", t: "2–4 weeks" },
              { v: "1-2m", t: "1–2 months" },
              { v: "flex", t: "Flexible" },
            ].map((o) => (
              <label key={o.v} style={{ display: "block", marginTop: 8 }}>
                <input
                  type="radio"
                  checked={moveWhen === (o.v as any)}
                  onChange={() => setMoveWhen(o.v as any)}
                />{" "}
                {o.t}
              </label>
            ))}
          </>
        )}

        {step === 5 && (
          <>
            <h2>Commute reality check</h2>
            <p>Write 1–2 lines. Example: “I work in Midtown. I can handle 45 min door-to-door.”</p>
            <textarea
              value={commuteNote}
              onChange={(e) => setCommuteNote(e.target.value)}
              rows={4}
              style={{ marginTop: 8, padding: 8, width: "100%" }}
              placeholder="Your commute limits…"
            />
          </>
        )}

        {step === 6 && (
          <>
            <h2>Dealbreakers</h2>
            <p>Select what will make you regret it.</p>
            {["No elevator", "No laundry", "Street noise", "Long walk to subway", "Broker fee"].map(
              (d) => (
                <label key={d} style={{ display: "block", marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={dealbreakers.includes(d)}
                    onChange={() => setDealbreakers(toggle(dealbreakers, d))}
                  />{" "}
                  {d}
                </label>
              )
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{ padding: "10px 14px" }}
        >
          Back
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            style={{ padding: "10px 14px" }}
          >
            Continue
          </button>
        ) : (
          <button onClick={saveAndGo} style={{ padding: "10px 14px" }}>
            See decision
          </button>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
        Step {step} of 6
      </p>
    </main>
  );
}