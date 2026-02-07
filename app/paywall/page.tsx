"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const LS_ANSWERS = "pepe_answers_v1";
const LS_SUB = "pepe_subscription_v1";

type SubState = {
  paywall_seen: boolean;
  subscribed: boolean;
  trial_started_at?: string; // ISO
};

export default function PaywallPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<any>(null);
  const [sub, setSub] = useState<SubState>({ paywall_seen: true, subscribed: false });

  useEffect(() => {
    const a = localStorage.getItem(LS_ANSWERS);
    if (!a) {
      router.push("/flow");
      return;
    }
    setAnswers(JSON.parse(a));

    const raw = localStorage.getItem(LS_SUB);
    if (raw) setSub(JSON.parse(raw));
    else localStorage.setItem(LS_SUB, JSON.stringify({ paywall_seen: true, subscribed: false }));
  }, [router]);

  const pressure = useMemo(() => {
    if (!answers) return "unknown";
    if (answers.moveWhen === "now") return "high";
    if (answers.moveWhen === "2-4w") return "medium";
    return "lower";
  }, [answers]);

  function startTrial() {
    const next: SubState = {
      paywall_seen: true,
      subscribed: true,
      trial_started_at: new Date().toISOString(),
    };
    localStorage.setItem(LS_SUB, JSON.stringify(next));
    setSub(next);
    router.push("/decision");
  }

  function notNow() {
    const next: SubState = { ...sub, paywall_seen: true };
    localStorage.setItem(LS_SUB, JSON.stringify(next));
    router.push("/exit");
  }

  if (!answers) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Before you commit</h1>
      <p style={{ marginTop: 6 }}>
        The Steady One is not a listings site. It helps you make one decision with less regret.
      </p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ marginTop: 0 }}>What you get</h2>

        <ul style={{ marginTop: 10, lineHeight: 1.6 }}>
          <li>Clear tradeoffs based on your constraints</li>
          <li>Pressure-aware guidance (NYC behavior, not generic scoring)</li>
          <li>Why now signals, so hesitation is conscious</li>
          <li>Support sections (guarantors, moving tools) when relevant</li>
        </ul>

        <div style={{ marginTop: 14, padding: 12, background: "#f7f7f7", borderRadius: 10 }}>
          <strong>Current pressure:</strong> {pressure.toUpperCase()} <br />
          <span style={{ opacity: 0.8 }}>
            In NYC, &quot;wait&quot; often means &quot;lose the option.&quot; The Steady One makes that trade explicit.
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ marginTop: 0 }}>Trial</h2>
        <p style={{ marginTop: 8 }}>
          3 days free, then $2.49/week. Cancel anytime.
        </p>

        <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={startTrial} style={{ padding: "10px 14px" }}>
            Start free trial
          </button>
          <button onClick={notNow} style={{ padding: "10px 14px" }}>
            Not now
          </button>
        </div>

        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75 }}>
          MVP note: payment is simulated for now. We are validating decision quality first.
        </p>

        {sub.subscribed && (
          <p style={{ marginTop: 10, fontSize: 13 }}>
            Status: <strong>Trial started</strong> ({sub.trial_started_at})
          </p>
        )}
      </div>
    </main>
  );
}
