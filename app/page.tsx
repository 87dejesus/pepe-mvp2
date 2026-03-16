import Header from '@/components/Header';
import Hero from '@/components/Hero';

export default function Home() {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-[#0A2540] font-sans">
      <Header />

      {/* Hero — full-width video with overlay text + CTA */}
      <Hero />

    </main>
  );
}
