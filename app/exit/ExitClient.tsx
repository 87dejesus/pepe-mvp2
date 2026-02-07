"use client";

import Link from "next/link";

export default function ExitClient() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-6 py-12 font-sans">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <img
          src="/brand/steady-one-blue.png"
          alt="The Steady One"
          className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-blue-200 object-cover"
        />

        {/* Main message */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
          It&apos;s okay to wait consciously.
        </h1>

        <p className="text-base text-gray-600 leading-relaxed mb-3">
          The NYC market moves fast, but rushing into a decision you&apos;re not sure about is worse than waiting.
        </p>

        <p className="text-base text-gray-600 leading-relaxed mb-8">
          Come back when you&apos;re ready &mdash; we&apos;ll be here to help you decide with clarity and zero panic.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/flow"
            className="block w-full bg-[#00A651] hover:bg-[#00913f] text-white font-bold text-base py-4 rounded-xl shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
          >
            Adjust My Criteria
          </Link>

          <Link
            href="/"
            className="block w-full bg-white border border-gray-200 text-gray-700 font-semibold text-base py-4 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
