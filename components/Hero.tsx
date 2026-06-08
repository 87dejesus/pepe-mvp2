import Link from 'next/link';
import Image from 'next/image';

const NAVY = '#0A2540';
const DEEP = '#071b30';
const GREEN = '#00A651';
const LINE = 'rgba(255,255,255,.14)';
const SERIF = 'var(--font-caslon), Georgia, serif';

// Etched NYC skyline (engraving style) — Statue of Liberty, Brooklyn Bridge,
// Empire State, Chrysler, water towers. Recognizable landmarks in line-art.
function Skyline() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, zIndex: 0, pointerEvents: 'none', opacity: 0.22 }} aria-hidden>
      <svg viewBox="0 0 420 170" fill="none" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <g>
          <path d="M12 158 L12 150 L40 150" />
          <path d="M16 158 L16 126 L36 126 L36 158" />
          <path d="M20 126 L25 84 L31 84 L34 126" />
          <circle cx="27.5" cy="78" r="4.5" />
          <path d="M22 75 l-2 -5 M26 73 l-1 -6 M29 73 l1 -6 M32 75 l2 -5" />
          <path d="M31 88 L41 66" />
          <path d="M39 66 l2 -7 l2 7 z" />
          <path d="M20 98 l-5 3 l0 8 l5 -3 z" />
        </g>
        <g>
          <path d="M54 158 L54 66 L82 66 L82 158" />
          <path d="M58 158 L58 106 L63 98 L68 106 L68 158" />
          <path d="M68 158 L68 106 L73 98 L78 106 L78 158" />
          <path d="M142 158 L142 66 L170 66 L170 158" />
          <path d="M146 158 L146 106 L151 98 L156 106 L156 158" />
          <path d="M156 158 L156 106 L161 98 L166 106 L166 158" />
          <path d="M24 120 Q46 72 68 66" />
          <path d="M68 66 Q112 130 156 66" />
          <path d="M156 66 Q178 72 196 120" />
          <path d="M22 134 L198 134" />
          <path d="M40 92 L40 134 M52 76 L52 134 M96 118 L96 134 M124 118 L124 134 M170 80 L170 134" strokeWidth={0.7} />
        </g>
        <path d="M178 158 L178 78 L182 78 L182 62 L186 62 L186 50 L190 50 L190 44 L191 30 L193 14 L195 30 L196 44 L200 44 L200 50 L204 50 L204 62 L208 62 L208 78 L212 78 L212 158" />
        <path d="M193 14 L193 6" strokeWidth={0.8} />
        <g>
          <path d="M238 158 L238 86 L266 86 L266 158" />
          <path d="M238 86 Q252 44 266 86" />
          <path d="M242 86 Q252 53 262 86" />
          <path d="M246 86 Q252 62 258 86" />
          <path d="M252 50 L252 26" strokeWidth={0.8} />
          <path d="M240 86 l4 -6 l4 6 M249 86 l3 -6 l3 6 M258 86 l4 -6 l4 6" strokeWidth={0.6} />
        </g>
        <path d="M286 158 L286 92 L312 92 L312 158" />
        <path d="M292 92 l3 -8 h10 l3 8 z M294 84 l0 -6 h10 l0 6 M295 78 l5 -5 h2 l5 5" strokeWidth={0.9} />
        <path d="M318 158 L318 70 L340 70 L340 158" />
        <path d="M346 158 L346 100 L372 100 L372 158" />
        <path d="M352 100 l3 -7 h9 l3 7 z M354 93 l0 -6 h7 l0 6" strokeWidth={0.9} />
        <path d="M378 158 L378 80 L406 80 L406 158" />
        <g strokeWidth={0.55} opacity={0.7}>
          <path d="M322 80 h14 M322 92 h14 M322 104 h14 M322 116 h14 M322 128 h14 M322 140 h14" />
          <path d="M382 92 h18 M382 104 h18 M382 116 h18 M382 128 h18 M382 140 h18" />
          <path d="M290 104 h16 M290 116 h16 M290 128 h16 M290 140 h16" />
        </g>
      </svg>
    </div>
  );
}

const PILLARS: [string, string, string][] = [
  ['1', 'Hold your non-negotiables', 'Set your lines once. Every place is scored against them.'],
  ['2', 'See the real tradeoff', 'What you gain, what you give up. No spin.'],
  ['3', 'NYC down to the train', 'The actual subway line and walk, not a guess.'],
];

export default function Hero() {
  return (
    <section style={{ width: '100%', minHeight: '100dvh', background: NAVY, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 0.7px, transparent 0.7px)', backgroundSize: '4px 4px', opacity: 0.5 }} />
      <Skyline />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* masthead */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 13px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Image src="/brand/heed-mascot.png" alt="Heed" width={22} height={30} style={{ height: 30, width: 'auto', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.4))' }} priority />
            <span style={{ fontFamily: SERIF, color: '#fff', fontSize: 16, letterSpacing: '.01em' }}>The Steady One</span>
          </div>
          <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>NYC · Rentals</span>
        </div>

        {/* hero */}
        <div style={{ padding: '32px 22px 8px', flex: 1 }}>
          <div style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 16 }}>For New York renters</div>
          <h1 style={{ fontFamily: SERIF, color: '#fff', fontSize: 42, lineHeight: 1.02, fontWeight: 400, letterSpacing: '.2px', marginBottom: 18, textShadow: '0 2px 20px rgba(7,27,48,.6)' }}>
            Stop scrolling.<br />Start <em style={{ fontStyle: 'italic', color: GREEN }}>deciding.</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 16, lineHeight: 1.55, maxWidth: '32ch' }}>
            You don&apos;t need more listings. You need to see the <b style={{ color: '#fff', fontWeight: 600 }}>tradeoffs</b>, hold your <b style={{ color: '#fff', fontWeight: 600 }}>non-negotiables</b>, and commit before it&apos;s gone.
          </p>

          <div style={{ margin: '24px 0 0', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
            {PILLARS.map(([n, t, d], i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 0', borderBottom: i < PILLARS.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                <span style={{ fontFamily: SERIF, color: 'rgba(255,255,255,.32)', fontSize: 18, lineHeight: 1, width: 22, flex: 'none' }}>{n}</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 14.5, fontWeight: 600 }}>{t}</div>
                  <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 13, lineHeight: 1.45, marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Heed strip — frosted so the etching shows through */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0 0', padding: '13px 16px', background: 'rgba(10,37,64,.3)', backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', border: `1px solid ${LINE}`, borderLeft: `3px solid ${GREEN}`, borderRadius: '0 14px 14px 0' }}>
            <Image src="/brand/heed-mascot.png" alt="Heed the crocodile" width={44} height={62} style={{ height: 62, width: 'auto', flex: 'none', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.45))' }} />
            <div>
              <div style={{ fontFamily: SERIF, color: '#fff', fontSize: 15.5, fontStyle: 'italic', lineHeight: 1.4, textShadow: '0 1px 8px rgba(7,27,48,.95), 0 0 2px rgba(7,27,48,.8)' }}>&ldquo;Tell me your lines. I&apos;ll tell you the truth about each place.&rdquo;</div>
              <div style={{ color: GREEN, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: 7 }}>Heed · your guide</div>
            </div>
          </div>
        </div>

        {/* CTA dock */}
        <div style={{ position: 'relative', zIndex: 1, padding: '18px 22px max(26px, env(safe-area-inset-bottom))', background: DEEP, borderTop: `1px solid ${LINE}` }}>
          <Link href="/flow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 14, background: GREEN, color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 24px rgba(0,166,81,.32)' }}>
            Find your steady home →
          </Link>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.55)', fontSize: 13.5, marginTop: 14 }}>
            Already have an account?{' '}
            <Link href="/signin" style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 500 }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.32)', fontSize: 11, marginTop: 12, letterSpacing: '.02em' }}>7 questions · about 2 minutes</p>
        </div>
      </div>
    </section>
  );
}
