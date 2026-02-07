"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const LS_KEY = "pepe_answers_v2";

type Answers = {
  boroughs: string[];
  budget: number;
  bedrooms: string;
  bathrooms: string;
  pets: string;
  amenities: string[];
  timing: string;
};

// Step configurations with unique themes and avatar moods
const stepConfigs = [
  {
    // Step 1: Boroughs - Curious/Explorative
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)",
    avatarFilter: "brightness(1.05) saturate(1.1)",
    avatarTransform: "rotate(-2deg)",
    accent: "#059669",
    shadow: "0 20px 60px rgba(5, 150, 105, 0.15)",
  },
  {
    // Step 2: Budget - Thoughtful/Calculating
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
    avatarFilter: "brightness(1.0) saturate(1.0) contrast(1.05)",
    avatarTransform: "rotate(2deg)",
    accent: "#047857",
    shadow: "0 20px 60px rgba(4, 120, 87, 0.15)",
  },
  {
    // Step 3: Bedrooms - Comfortable/Relaxed
    gradient: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)",
    avatarFilter: "brightness(1.08) saturate(1.15) hue-rotate(-5deg)",
    avatarTransform: "rotate(-1deg) scale(1.02)",
    accent: "#0d9488",
    shadow: "0 20px 60px rgba(13, 148, 136, 0.15)",
  },
  {
    // Step 4: Bathrooms - Practical/Direct
    gradient: "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
    avatarFilter: "brightness(1.02) saturate(0.95)",
    avatarTransform: "rotate(1deg)",
    accent: "#0891b2",
    shadow: "0 20px 60px rgba(8, 145, 178, 0.15)",
  },
  {
    // Step 5: Pets - Warm/Friendly
    gradient: "linear-gradient(135deg, #fef9c3 0%, #fef08a 30%, #ecfccb 100%)",
    avatarFilter: "brightness(1.1) saturate(1.2) sepia(0.1)",
    avatarTransform: "rotate(-3deg) scale(1.03)",
    accent: "#65a30d",
    shadow: "0 20px 60px rgba(101, 163, 13, 0.2)",
  },
  {
    // Step 6: Amenities - Excited/Eager
    gradient: "linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 50%, #e9d5ff 100%)",
    avatarFilter: "brightness(1.05) saturate(1.1) hue-rotate(10deg)",
    avatarTransform: "rotate(2deg) scale(1.01)",
    accent: "#9333ea",
    shadow: "0 20px 60px rgba(147, 51, 234, 0.15)",
  },
  {
    // Step 7: Timing - Confident/Ready
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #6ee7b7 50%, #34d399 100%)",
    avatarFilter: "brightness(1.12) saturate(1.25) contrast(1.05)",
    avatarTransform: "rotate(0deg) scale(1.05)",
    accent: "#059669",
    shadow: "0 25px 70px rgba(5, 150, 105, 0.25)",
  },
];

export default function FlowPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Form state
  const [boroughs, setBoroughs] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(3500);
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [pets, setPets] = useState<string>("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [timing, setTiming] = useState<string>("");

  const config = stepConfigs[step - 1];

  function toggleArray(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  }

  function canContinue(): boolean {
    if (step === 1) return boroughs.length > 0;
    if (step === 2) return budget >= 500;
    if (step === 3) return bedrooms !== "";
    if (step === 4) return bathrooms !== "";
    if (step === 5) return pets !== "";
    if (step === 6) return true;
    if (step === 7) return timing !== "";
    return false;
  }

  function handleNext() {
    if (step < 7) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsTransitioning(false);
      }, 200);
    } else {
      const answers: Answers = {
        boroughs,
        budget,
        bedrooms,
        bathrooms,
        pets,
        amenities,
        timing,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(answers));
      setShowDiagnosis(true);
    }
  }

  function handleBack() {
    if (step > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsTransitioning(false);
      }, 200);
    }
  }

  useEffect(() => {
    if (showDiagnosis) {
      const timer = setTimeout(() => {
        window.location.href = "/decision";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDiagnosis]);

  // DIAGNOSIS SCREEN
  if (showDiagnosis) {
    return (
      <div
        style={{
          padding: 24,
          maxWidth: 600,
          margin: "0 auto",
          textAlign: "center",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #ecfdf5 0%, #34d399 50%, #059669 100%)",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 32,
            padding: "48px 40px",
            boxShadow: "0 30px 80px rgba(5, 150, 105, 0.3)",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 24px",
              boxShadow: "0 12px 40px rgba(5, 150, 105, 0.3)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <Image
              src="/brand/steady-one-blue.png"
              alt="The Steady One"
              width={140}
              height={140}
              style={{
                objectFit: "cover",
                filter: "brightness(1.1) saturate(1.2)",
              }}
              unoptimized
            />
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #059669",
              borderTopColor: "transparent",
              borderRadius: "50%",
              margin: "0 auto 24px",
              animation: "spin 1s linear infinite",
            }}
          />
          <h1 style={{ marginBottom: 12, fontSize: 28, color: "#059669", fontWeight: 700 }}>
            Gathering the facts...
          </h1>
          <p style={{ fontSize: 16, color: "#52525b", lineHeight: 1.6, maxWidth: 320 }}>
            I'm finding paths that minimize the usual NYC frustrations based on what you told me.
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // Brand Avatar Component
  const SteadyAvatar = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 24,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isTransitioning ? 0.5 : 1,
        transform: isTransitioning ? "scale(0.95)" : "scale(1)",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: config.shadow,
          border: `4px solid ${config.accent}`,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: config.avatarTransform,
        }}
      >
        <Image
          src="/brand/steady-one-blue.png"
          alt="The Steady One - Your NYC Guide"
          width={120}
          height={120}
          style={{
            objectFit: "cover",
            filter: config.avatarFilter,
            transition: "filter 0.4s ease",
          }}
          unoptimized
        />
      </div>
    </div>
  );

  // Progress Bar Component
  const ProgressBar = () => (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: config.accent,
            letterSpacing: "0.5px",
          }}
        >
          Step {step} of 7
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#71717a",
            fontWeight: 500,
          }}
        >
          {Math.round((step / 7) * 100)}% Complete
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(0,0,0,0.08)",
          borderRadius: 100,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(step / 7) * 100}%`,
            background: `linear-gradient(90deg, ${config.accent}, ${stepConfigs[Math.min(step, 6)].accent})`,
            borderRadius: 100,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );

  // Option Card Component
  const OptionCard = ({
    selected,
    onClick,
    children,
    type = "radio",
  }: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
    type?: "radio" | "checkbox";
  }) => (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 20px",
        marginBottom: 10,
        borderRadius: 16,
        border: selected ? `2px solid ${config.accent}` : "2px solid transparent",
        background: selected ? `${config.accent}10` : "white",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: selected
          ? `0 4px 20px ${config.accent}20`
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: type === "radio" ? "50%" : 6,
          border: `2px solid ${selected ? config.accent : "#d4d4d8"}`,
          marginRight: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: selected ? config.accent : "white",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        {selected && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L5.5 10L11.5 4"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 16, color: "#27272a", fontWeight: selected ? 600 : 500 }}>
        {children}
      </span>
    </div>
  );

  // Question Text Component
  const QuestionText = ({ text }: { text: string }) => (
    <h1
      style={{
        fontSize: 22,
        lineHeight: 1.4,
        color: "#18181b",
        fontWeight: 600,
        textAlign: "center",
        marginBottom: 28,
        transition: "opacity 0.3s ease",
        opacity: isTransitioning ? 0.5 : 1,
      }}
    >
      {text}
    </h1>
  );

  // QUESTIONNAIRE
  return (
    <div
      style={{
        minHeight: "100vh",
        background: config.gradient,
        transition: "background 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          padding: "32px 24px",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <ProgressBar />
        <SteadyAvatar />

        {/* STEP 1: Boroughs */}
        {step === 1 && (
          <div>
            <QuestionText text="NYC is intense. In which boroughs would your daily life flow better?" />
            <div>
              {["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map((b) => (
                <OptionCard
                  key={b}
                  selected={boroughs.includes(b)}
                  onClick={() => setBoroughs(toggleArray(boroughs, b))}
                  type="checkbox"
                >
                  {b}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Budget */}
        {step === 2 && (
          <div>
            <QuestionText text="How much are you comfortable investing monthly for a peaceful home?" />
            <div
              style={{
                background: "white",
                borderRadius: 20,
                padding: "28px 24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  marginBottom: 24,
                  color: config.accent,
                  textAlign: "center",
                }}
              >
                ${budget.toLocaleString()}
                <span style={{ fontSize: 18, fontWeight: 500, color: "#71717a" }}>/mo</span>
              </div>
              <input
                type="range"
                min={1000}
                max={15000}
                step={100}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: 8,
                  accentColor: config.accent,
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#a1a1aa",
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>$1,000</span>
                <span>$15,000</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Bedrooms */}
        {step === 3 && (
          <div>
            <QuestionText text="How many bedrooms do you need to feel comfortable?" />
            <div>
              {[
                { value: "0", label: "Studio" },
                { value: "1", label: "1 Bedroom" },
                { value: "2", label: "2 Bedrooms" },
                { value: "3+", label: "3+ Bedrooms" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={bedrooms === opt.value}
                  onClick={() => setBedrooms(opt.value)}
                >
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Bathrooms */}
        {step === 4 && (
          <div>
            <QuestionText text="How many bathrooms are essential for smooth mornings?" />
            <div>
              {[
                { value: "1", label: "1 Bathroom" },
                { value: "1.5", label: "1.5 Bathrooms" },
                { value: "2+", label: "2+ Bathrooms" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={bathrooms === opt.value}
                  onClick={() => setBathrooms(opt.value)}
                >
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Pets */}
        {step === 5 && (
          <div>
            <QuestionText text="Any furry friends coming along for the NYC adventure?" />
            <div>
              {[
                { value: "none", label: "No pets" },
                { value: "cats", label: "Cats" },
                { value: "dogs", label: "Dogs" },
                { value: "both", label: "Both cats and dogs" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={pets === opt.value}
                  onClick={() => setPets(opt.value)}
                >
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Amenities */}
        {step === 6 && (
          <div>
            <QuestionText text="Which amenities would make your daily life easier?" />
            <p
              style={{
                color: "#71717a",
                marginBottom: 20,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              Select all that apply (optional)
            </p>
            <div>
              {[
                { value: "washer_dryer", label: "W/D in unit" },
                { value: "elevator", label: "Elevator" },
                { value: "doorman", label: "Doorman" },
                { value: "gym", label: "Gym" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={amenities.includes(opt.value)}
                  onClick={() => setAmenities(toggleArray(amenities, opt.value))}
                  type="checkbox"
                >
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: Timing */}
        {step === 7 && (
          <div>
            <QuestionText text="When are you looking to make this move happen?" />
            <div>
              {[
                { value: "asap", label: "ASAP - I need to move soon" },
                { value: "30days", label: "Within 30 days" },
                { value: "researching", label: "Just researching for now" },
              ].map((opt) => (
                <OptionCard
                  key={opt.value}
                  selected={timing === opt.value}
                  onClick={() => setTiming(opt.value)}
                >
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{
                padding: "16px 28px",
                borderRadius: 14,
                border: "none",
                background: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 16,
                color: "#52525b",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s ease",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            style={{
              flex: 1,
              padding: "16px 28px",
              borderRadius: 14,
              border: "none",
              background: canContinue()
                ? `linear-gradient(135deg, ${config.accent}, ${config.accent}dd)`
                : "#e4e4e7",
              color: "white",
              cursor: canContinue() ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 16,
              boxShadow: canContinue() ? `0 8px 24px ${config.accent}40` : "none",
              transition: "all 0.3s ease",
              transform: canContinue() ? "translateY(0)" : "translateY(0)",
            }}
          >
            {step === 7 ? "Find My Perfect Match" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
