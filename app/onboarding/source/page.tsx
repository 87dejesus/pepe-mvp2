'use client';

import { useState } from 'react';
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
import { OnboardingProgress } from '@/components/OnboardingProgress';

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
  const [selected, setSelected] = useState<SourceId | null>(null);
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(false);

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

    router.push('/onboarding/tradeoffs');
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A2540]">
      <Header />

      <div className="flex-1 flex flex-col px-5 pb-8 max-w-lg mx-auto w-full">
        <OnboardingProgress step={8} />

        {/* Heed speech bubble */}
        <div className="flex items-start gap-3 mb-6">
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed"
            width={40}
            height={40}
            className="object-contain shrink-0 mt-0.5"
          />
          <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-sm font-semibold text-[#0A2540] leading-snug">
              Where did you hear about The Steady One?
            </p>
            <p className="text-[11px] text-[#0A2540]/50 mt-0.5">
              Heed wants to know to improve
            </p>
          </div>
        </div>

        {/* Source grid — 2 columns, icons rendered inline */}
        <div className="grid grid-cols-2 gap-4 px-4 mb-6">
          {SOURCES.map(({ id, label, Icon, color }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`flex flex-col items-center justify-center p-6 bg-[#0A2540]/80 rounded-xl border transition-all text-white ${
                selected === id
                  ? 'border-[#00A651]'
                  : 'border-[#00A651]/30 hover:border-[#00A651]'
              }`}
            >
              <Icon className={`w-10 h-10 mb-3 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {selected === 'other' && (
          <div className="px-4 -mt-3 mb-6">
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Tell us how you found us…"
              autoFocus
              className="w-full bg-white/[0.07] border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
            />
          </div>
        )}

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
