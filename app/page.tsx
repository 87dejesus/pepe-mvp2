import Hero from '@/components/Hero';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[#0A2540] font-sans">
      {/* Editorial broadsheet hero — masthead, etched NYC skyline, Heed, CTA */}
      <Hero />
    </main>
  );
}
