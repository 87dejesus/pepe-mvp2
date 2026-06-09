'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type FlowAnswers = {
  boroughs?: string[];
  budget?: number;
  bedrooms?: string;
  pets?: string;
};

const NAVY = '#0A2540';
const DEEP = '#071b30';
const GREEN = '#00A651';
const LINE = 'rgba(255,255,255,.14)';
const SERIF = 'var(--font-caslon), Georgia, serif';

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function PreviewPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<FlowAnswers>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('heed_answers_v2');
      if (raw) setAnswers(JSON.parse(raw) as FlowAnswers);
    } catch {}
  }, []);

  const borough = answers.boroughs?.[0] ?? 'Brooklyn';
  const budget = answers.budget ?? 3500;
  const bedrooms = answers.bedrooms ?? '1';
  const bedroomLabel = bedrooms === '0' ? 'Studio' : bedrooms === '3+' ? '3+ beds' : `${bedrooms} bed${bedrooms === '1' ? '' : 's'}`;
  const petsOk = !!answers.pets && answers.pets !== 'none';
  const price = Math.round((budget * 0.91) / 50) * 50;       // a place that sits under their ceiling
  const incomeNeeded = price * 40;
  const moveIn = price * 2;

  const nn = [
    { t: `Under ${money(budget)}` },
    { t: `${bedroomLabel} · exact` },
    { t: borough },
    { t: petsOk ? 'Pets ok' : 'No pets needed' },
  ];
  const truths = [
    { ic: '🧮', tt: `Will you qualify · ≈ ${money(incomeNeeded)} / yr` },
    { ic: '💸', tt: `Real cost to move in · ≈ ${money(moveIn)}` },
    { ic: '🛡️', tt: 'Scam check · priced in range' },
    { ic: '🏛️', tt: 'Rent-stabilized? · worth checking' },
  ];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif', padding: '0 0 env(safe-area-inset-bottom)' }}>
      <div style={{ width: '100%', maxWidth: 440, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ padding: '18px 22px 10px', textAlign: 'center', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ color: GREEN, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>A place that fits your lines</div>
          <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 23, fontWeight: 400, lineHeight: 1.15 }}>You match this one. Now the part that matters.</h1>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, marginTop: 7 }}>Heed checks what every listing hides. Here&apos;s the read you get.</p>
        </div>

        {/* free: the match */}
        <div style={{ position: 'relative', height: 150, background: '#16384f' }}>
          <Image src="/preview/example-studio.jpg" alt={`${borough} home`} fill style={{ objectFit: 'cover', opacity: 0.92 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(7,27,48,.1),rgba(7,27,48,0) 40%,rgba(7,27,48,.85))' }} />
          <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(7,27,48,.72)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)' }}>{borough}</span>
          <span style={{ position: 'absolute', top: 12, right: 12, background: GREEN, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 999 }}>★ Strong match</span>
        </div>
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ fontFamily: SERIF, color: '#fff', fontSize: 21 }}>A steady pick in {borough}.</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: SERIF, color: '#fff', fontSize: 20 }}>{money(price)}</span>
            <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>/ mo</span>
            <span style={{ marginLeft: 'auto', color: GREEN, fontSize: 12, fontWeight: 600 }}>{money(budget - price)} under your ceiling</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, padding: '14px 20px' }}>
          {nn.map((c) => (
            <div key={c.t} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 10px' }}>
              <span style={{ width: 16, height: 16, borderRadius: 999, background: GREEN, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✓</span>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{c.t}</span>
            </div>
          ))}
        </div>

        {/* locked: the truths */}
        <div style={{ position: 'relative' }}>
          <div style={{ padding: '14px 20px 26px', filter: 'blur(3px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 12 }}>Before you commit · what Heed checked</div>
            {truths.map((t) => (
              <div key={t.tt} style={{ display: 'flex', gap: 10, padding: '9px 0', alignItems: 'center' }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(255,255,255,.06)', border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: 'none' }}>{t.ic}</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t.tt}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 11, padding: 24, background: 'linear-gradient(180deg,rgba(10,37,64,0) 0%,rgba(10,37,64,.78) 30%,rgba(7,27,48,.96) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(255,255,255,.1)', border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔒</span>
              The truths are behind the paywall
            </div>
            <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 21, fontWeight: 400, textAlign: 'center', lineHeight: 1.2, maxWidth: '28ch' }}>Unlock the honest read on every place you&apos;re weighing.</h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center', maxWidth: '30ch', lineHeight: 1.5 }}>Qualify? Real move-in cost? Scam check? The fine print to ask. On every listing.</p>
          </div>
        </div>

        {/* dock */}
        <div style={{ marginTop: 'auto', padding: '14px 22px 24px', background: DEEP, borderTop: `1px solid ${LINE}` }}>
          <button onClick={() => router.push('/onboarding/pricing')} style={{ width: '100%', height: 58, borderRadius: 14, background: GREEN, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,166,81,.34)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.15 }}>
            Unlock my matches
            <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.85 }}>$9.49 · one-time, 30 days</span>
          </button>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.42)', fontSize: 11.5, marginTop: 11 }}>No subscription. One honest read on every place you&apos;re considering.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center', marginTop: 12, color: 'rgba(255,255,255,.55)', fontSize: 12 }}>
            <Image src="/brand/heed-mascot.png" alt="Heed" width={22} height={30} style={{ height: 30, width: 'auto' }} unoptimized /> Heed already did the digging.
          </div>
        </div>
      </div>
    </div>
  );
}
