"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";

export default function ExitClient() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F6F3] font-sans">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-md w-full text-center">
          {/* Mascot slot: replace src with a transparent PNG/WebP when available (e.g. /brand/heed-mascot.png) */}
          <Image
            src="/brand/heed-mascot.png"
            alt="Heed mascot"
            width={96}
            height={96}
            className="object-contain mx-auto mb-6"
          />

          {/* Main message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-4 leading-tight">
            It&apos;s okay to wait thoughtfully!
          </h1>

          <p className="text-base text-[#666666] leading-relaxed mb-8">
            The NYC market moves fast, but rushing into a decision you&apos;re not sure about is worse than waiting. Come back when you&apos;re ready.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/flow"
              className="flex items-center justify-center w-full bg-[#0A2540] hover:bg-[#0d2f52] text-white font-semibold text-base h-14 rounded-lg active:scale-[0.98] transition-all"
            >
              Back to Flow
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center w-full border border-[#0A2540] bg-white text-[#0A2540] font-semibold text-base h-14 rounded-lg hover:bg-[#F8F6F3] active:scale-[0.98] transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
