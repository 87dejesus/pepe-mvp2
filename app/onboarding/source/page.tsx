'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Music,
  MessageCircle,
  Twitter,
  Search,
  Instagram,
  Users,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/Header';

const SERIF = 'var(--font-caslon), Georgia, serif';

type SourceId =
  | 'tiktok'
  | 'reddit'
  | 'x'
  | 'google'
  | 'instagram'
  | 'friend_family'
  | 'other';

// Store component references — NOT pre-created JSX elements.
// Pre-created JSX in module-level arrays fails to hydrate in Next.js production builds.
const SOURCES: { id: SourceId; label: string; Icon: LucideIcon; color: string }[] = [
  { id: 'tiktok',        label: 'TikTok',          Icon: Music,          color: 'text-[#00F2EA]' },
  { id: 'reddit',        label: 'Reddit',           Icon: MessageCircle,  color: 'text-[#FF4500]' },
  { id: 'x',             label: 'X (Twitter)',      Icon: Twitter,        color: 'text-white' },
  { id: 'google',        label: 'Google',           Icon: Search,         color: 'text-[#4285F4]' },
  { id: 'instagram',     label: 'Instagram',        Icon: Instagram,      color: 'text-[#E1306C]' },
  { id: 'friend_family', label: 'Friend or family', Icon: Users,          color: 'text-[#00A651]' },
  { id: 'other',         label: 'Other',            Icon: MoreHorizontal, color: 'text-gray-400' },
];

export default function SourcePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<SourceId | null>(null);
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);

  // Asked once. If a referral source is already saved, skip straight to the desk.
  useEffect(() => {
    if (localStorage.getItem('heed_referral_source')) {
      router.replace('/decision');
      return;
    }
    setReady(true);
  }, [router]);

  const canContinue =
    selected !== null && (selected !== 'other' || otherText.trim().length > 0);

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);
    const value =
      selected === 'other' ? `other:${otherText.trim()}` : selected!;
    localStorage.setItem('heed_referral_source', value);

    // Fire-and-forget — succeeds only if user is already authenticated
    fetch('/api/onboarding/save-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: value }),
    }).catch(() => {});

    router.push('/decision');
  }

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A2540]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 overflow-y-auto px-5 max-w-lg mx-auto w-full">
        {/* Heed voice */}
        <div className="flex items-start gap-3 mb-6 mt-2">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={44}
            height={60}
            unoptimized
            className="object-contain shrink-0"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.4))' }}
          />
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#00A651] mb-1.5">
              Heed asks
            </div>
            <h1 className="text-white text-[24px] leading-[1.14]" style={{ fontFamily: SERIF }}>
              Where did you hear about us?
            </h1>
            <p className="text-white/55 text-[12.5px] leading-snug mt-1.5">
              Helps Heed know what&apos;s working.
            </p>
          </div>
        </div>

        {/* Source grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SOURCES.map(({ id, label, Icon, color }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`flex flex-col items-center justify-center p-6 bg-white/[0.04] rounded-xl border transition-all text-white ${
                selected === id
                  ? 'border-[#00A651] bg-[#00A651]/10'
                  : 'border-white/15 hover:border-[#00A651]/60'
              }`}
            >
              <Icon className={`w-9 h-9 mb-3 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {selected === 'other' && (
          <div className="mb-6">
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Tell us how you found us…"
              autoFocus
              className="w-full bg-white/[0.06] border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
            />
          </div>
        )}

        <div className="pb-4" />
      </div>

      <div className="px-5 pb-6 pt-3 max-w-lg mx-auto w-full">
        <button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className={`w-full h-14 rounded-xl font-semibold text-base transition-all ${
            canContinue && !loading
              ? 'bg-[#00A651] text-white hover:bg-[#00913f] active:scale-[0.98]'
              : 'bg-white/[0.07] text-white/25 cursor-not-allowed'
          }`}
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
