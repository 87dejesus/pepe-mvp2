"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function ExitClient() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A] font-sans">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-md w-full text-center">
          {/* Pepe mascot */}
          <img
            src="/brand/pepe-ny.jpeg"
            alt="Pepe"
            className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-white/30 object-cover shadow-lg"
          />

          {/* Main message */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
            It&apos;s okay to wait consciously!
          </h1>

          <p className="text-base text-white/80 leading-relaxed mb-8">
            The NYC market moves fast, but rushing into a decision you&apos;re not sure about is worse than waiting. Come back when you&apos;re ready.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/flow"
              className="block w-full bg-[#00A651] hover:bg-[#00913f] text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-black/20 active:scale-[0.98] transition-all border-2 border-white/20"
            >
              Back to Flow
            </Link>

            <Link
              href="/"
              className="block w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-base py-4 rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
