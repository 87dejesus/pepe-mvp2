"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";

const NAVY = "#0A2540";
const GREEN = "#00A651";
const LINE = "rgba(255,255,255,.14)";
const SERIF = "var(--font-caslon), Georgia, serif";

export default function ExitClient() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#0c1a26",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: NAVY,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* halftone newsprint texture */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(rgba(255,255,255,.05) .7px, transparent .7px)",
            backgroundSize: "4px 4px",
            opacity: 0.5,
          }}
        />
        {/* etched skyline, bottom-anchored */}
        <svg
          aria-hidden
          viewBox="0 0 420 200"
          preserveAspectRatio="xMidYMax meet"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: 200,
            opacity: 0.14,
            pointerEvents: "none",
          }}
        >
          <g stroke="#ffffff" strokeWidth="1.1" fill="none">
            <path d="M0 200 V150 H22 V120 H40 V150 H64 V90 H86 V150 H110 V70 H120 V55 H132 V70 H140 V150 H168 V110 H190 V150 H214 V64 H226 V40 H238 V64 H248 V150 H276 V100 H300 V150 H322 V82 H344 V150 H368 V120 H392 V150 H420 V200 Z" />
            <path d="M120 55 V40 M226 40 V22" />
          </g>
        </svg>

        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", flex: 1 }}>
          <Header />

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "24px 26px 40px",
            }}
          >
            <Image
              src="/brand/heed-mascot.png"
              alt="Heed"
              width={96}
              height={132}
              unoptimized
              style={{
                height: 96,
                width: "auto",
                margin: "0 auto 22px",
                display: "block",
                filter: "drop-shadow(0 8px 18px rgba(0,0,0,.4))",
              }}
            />

            <div
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: GREEN,
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              No rush
            </div>

            <h1
              style={{
                fontFamily: SERIF,
                color: "#fff",
                fontSize: 30,
                fontWeight: 400,
                lineHeight: 1.12,
                textShadow: "0 2px 14px rgba(0,0,0,.4)",
              }}
            >
              Waiting is a decision too.
            </h1>

            <p
              style={{
                color: "rgba(255,255,255,.62)",
                fontSize: 14.5,
                marginTop: 14,
                lineHeight: 1.55,
                maxWidth: "34ch",
              }}
            >
              The NYC market moves fast, but signing a place you&apos;re unsure about
              is worse than waiting a week. Come back when your head is clear. Your
              lines will be here.
            </p>

            <div
              style={{
                width: "100%",
                marginTop: 30,
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              <Link
                href="/decision"
                style={{
                  width: "100%",
                  height: 54,
                  borderRadius: 13,
                  background: GREEN,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 24px rgba(0,166,81,.3)",
                  textDecoration: "none",
                }}
              >
                Back to my matches
              </Link>

              <Link
                href="/flow"
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 13,
                  background: "rgba(255,255,255,.06)",
                  border: `1px solid ${LINE}`,
                  color: "rgba(255,255,255,.78)",
                  fontWeight: 600,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                Start a new search
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
