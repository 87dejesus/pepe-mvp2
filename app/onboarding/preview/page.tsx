'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DecisionListingCard from '@/components/DecisionListingCard';

type Answers = {
  boroughs?: string[];
  budget?: number;
  bedrooms?: string;
  pets?: string;
  housingType?: string;
  upfrontCash?: string;
  qualification?: string;
};

type Listing = {
  id: string;
  address?: string;
  neighborhood: string;
  borough: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  description: string;
  image_url: string;
  images: string[];
  pets: string;
  amenities: string[];
  original_url: string | null;
  transit?: string;
  housing_type?: string;
  status?: string;
};

const NAVY = '#0A2540';
const DEEP = '#071b30';
const GREEN = '#00A651';
const LINE = 'rgba(255,255,255,.14)';
const SERIF = 'var(--font-caslon), Georgia, serif';

function bedNum(a?: string): number {
  return ({ '0': 0, '1': 1, '2': 2, '3+': 3 } as Record<string, number>)[a ?? '1'] ?? 1;
}

export default function PreviewPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [match, setMatch] = useState<Listing | null>(null);
  const [count, setCount] = useState(0);
  const [belowMarket, setBelowMarket] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a: Answers = {};
    try {
      const raw = localStorage.getItem('heed_answers_v2');
      if (raw) a = JSON.parse(raw) as Answers;
    } catch {}
    setAnswers(a);

    (async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase.from('listings').select('*').eq('status', 'Active').gt('price', 0);
        const all: Listing[] = (data as Listing[]) ?? [];
        const needBeds = bedNum(a.bedrooms);
        const budget = a.budget ?? 3500;
        const boroughs = (a.boroughs ?? []).map((b) => b.toLowerCase());

        const fits = all.filter((l) => {
          const boroughOk = boroughs.length === 0 || boroughs.some((b) => (l.borough || '').toLowerCase().includes(b));
          const budgetOk = l.price <= budget * 1.1;
          return boroughOk && budgetOk;
        });
        const ranked = (fits.length ? fits : all)
          .slice()
          .sort((x, y) => {
            const xb = Math.abs(x.bedrooms - needBeds) - (x.price <= budget ? 0.5 : 0);
            const yb = Math.abs(y.bedrooms - needBeds) - (y.price <= budget ? 0.5 : 0);
            return xb - yb || x.price - y.price;
          });
        const top = ranked[0] ?? null;
        setMatch(top);
        setCount(fits.length || all.length);

        if (top) {
          const peers = all
            .filter((l) => l.borough === top.borough && l.bedrooms === top.bedrooms && l.price > 0)
            .map((l) => l.price)
            .sort((p, q) => p - q);
          if (peers.length >= 5) {
            const median = peers[Math.floor(peers.length / 2)];
            setBelowMarket(top.price < median * 0.6);
          }
        }
      } catch {
        // leave match null -> graceful fallback below
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cardAnswers = {
    boroughs: answers.boroughs ?? [],
    budget: answers.budget ?? 3500,
    bedrooms: answers.bedrooms ?? '1',
    bathrooms: '1',
    pets: answers.pets ?? 'none',
    amenities: [],
    timing: 'researching',
    housingType: answers.housingType,
    upfrontCash: answers.upfrontCash,
    qualification: answers.qualification,
  };

  const chips: string[] = [];
  if (answers.housingType) chips.push(answers.housingType === 'whole' ? 'A place of my own' : answers.housingType === 'shared' ? 'Open to sharing' : 'Both');
  if (answers.bedrooms) chips.push(({ '0': 'Studio', '1': '1 bed', '2': '2 beds', '3+': '3+ beds' } as Record<string, string>)[answers.bedrooms]);
  if (answers.qualification) chips.push(({ income40x: 'Income clears 40x', guarantor: 'Guarantor', service: 'Guarantor service', lowbarrier: 'Low-barrier' } as Record<string, string>)[answers.qualification]);
  if (answers.pets && answers.pets !== 'none') chips.push('Pets ok');

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: NAVY, padding: 24, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <Image src="/brand/heed-mascot.png" alt="Heed" width={88} height={88} className="object-contain" style={{ marginBottom: 20, animation: 'hp 2s ease-in-out infinite' }} unoptimized />
        <div style={{ width: 26, height: 26, border: '2px solid rgba(255,255,255,.5)', borderTopColor: 'transparent', borderRadius: 999, animation: 'hs 1s linear infinite' }} />
        <style>{`@keyframes hs{to{transform:rotate(360deg)}}@keyframes hp{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0c1a26', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, background: NAVY, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {/* journey summary (mirror) */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ color: GREEN, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 9 }}>Here&apos;s what you told me</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((c) => (
              <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: `1px solid ${LINE}`, borderRadius: 999, padding: '5px 11px', fontSize: 12, color: '#fff', fontWeight: 500 }}>
                <span style={{ width: 14, height: 14, borderRadius: 999, background: GREEN, color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>{c}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 13, color: 'rgba(255,255,255,.6)', fontSize: 13.5 }}>
            I found <b style={{ color: '#fff', fontFamily: SERIF, fontSize: 16 }}>{count} places</b> that fit your lines. Here&apos;s the honest read on your top one, free.
          </div>
        </div>

        {/* the free match (the aha) */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Your #1 match · free read</div>
          {match ? (
            <DecisionListingCard listing={match} answers={cardAnswers} matchScore={85} recommendation="ACT_NOW" belowMarket={belowMarket} />
          ) : (
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, padding: 20, textAlign: 'center' }}>Fresh listings are loading from NYC sources. Sign in to see your matches.</div>
          )}
        </div>

        {/* honest paywall */}
        <div style={{ marginTop: 18, padding: '18px 22px 26px', background: DEEP, borderTop: `1px solid ${LINE}` }}>
          <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 19, fontWeight: 400, textAlign: 'center', lineHeight: 1.25, marginBottom: 4 }}>Get this honest read on all {count} of your matches.</h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12.5, textAlign: 'center', marginBottom: 15 }}>This was one. You&apos;ve got a full list that holds the same lines.</p>
          <button onClick={() => router.push('/paywall')} style={{ width: '100%', height: 58, borderRadius: 14, background: GREEN, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,166,81,.34)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.15 }}>
            See all your matches
          </button>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 11 }}>That read was free. So are the rest.</p>
        </div>
      </div>
    </div>
  );
}
