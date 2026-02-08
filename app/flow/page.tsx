"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";

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
      <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
            <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-6 border-4 border-[#00A651] shadow-lg"
              style={{ animation: "pulse 2s ease-in-out infinite" }}
            >
              <Image
                src="/brand/pepe-ny.jpeg"
                alt="Pepe analyzing..."
                width={112}
                height={112}
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>
            <div className="w-10 h-10 border-4 border-[#1E3A8A] border-t-transparent rounded-full mx-auto mb-6"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <h1 className="text-2xl font-extrabold text-[#1E3A8A] mb-3">
              Gathering the facts...
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
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
      </div>
    );
  }

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
      className={`flex items-center p-4 mb-2 rounded-xl cursor-pointer transition-all border-2 ${
        selected
          ? 'border-[#00A651] bg-[#00A651]/10 shadow-md'
          : 'border-white/30 bg-white/90 hover:bg-white'
      }`}
    >
      <div
        className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 mr-3 transition-all ${
          type === "radio" ? "rounded-full" : "rounded-md"
        } ${
          selected
            ? "border-[#00A651] bg-[#00A651]"
            : "border-gray-300 bg-white"
        }`}
      >
        {selected && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`text-base ${selected ? "font-bold text-[#1E3A8A]" : "font-medium text-gray-700"}`}>
        {children}
      </span>
    </div>
  );

  // QUESTIONNAIRE
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A]">
      <Header />

      <div className="flex-1 flex flex-col px-6 pb-8 max-w-lg mx-auto w-full">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-white/80">Step {step} of 7</span>
            <span className="text-xs text-white/60 font-medium">{Math.round((step / 7) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A651] rounded-full transition-all duration-400"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Pepe mascot + Question */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-white/40 shrink-0 shadow-lg transition-all duration-300 ${
            isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
          }`}>
            <img
              src="/brand/pepe-ny.jpeg"
              alt="Pepe"
              className="w-full h-full object-cover"
            />
          </div>
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 flex-1 shadow-md transition-opacity duration-200 ${
            isTransitioning ? 'opacity-50' : 'opacity-100'
          }`}>
            <p className="text-lg font-bold text-[#1E3A8A] leading-snug">
              {step === 1 && "NYC is intense. In which boroughs would your daily life flow better?"}
              {step === 2 && "How much are you comfortable investing monthly for a peaceful home?"}
              {step === 3 && "How many bedrooms do you need to feel comfortable?"}
              {step === 4 && "How many bathrooms are essential for smooth mornings?"}
              {step === 5 && "Any furry friends coming along for the NYC adventure?"}
              {step === 6 && "Which amenities would make your daily life easier?"}
              {step === 7 && "When are you looking to make this move happen?"}
            </p>
            {step === 6 && (
              <p className="text-xs text-gray-500 mt-1">Select all that apply (optional)</p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="flex-1">
          {/* STEP 1: Boroughs */}
          {step === 1 && (
            <div>
              {["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"].map((b) => (
                <OptionCard key={b} selected={boroughs.includes(b)} onClick={() => setBoroughs(toggleArray(boroughs, b))} type="checkbox">
                  {b}
                </OptionCard>
              ))}
            </div>
          )}

          {/* STEP 2: Budget */}
          {step === 2 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-md">
              <div className="text-4xl font-extrabold text-[#1E3A8A] text-center mb-6">
                ${budget.toLocaleString()}
                <span className="text-lg font-medium text-gray-400">/mo</span>
              </div>
              <input
                type="range"
                min={1000}
                max={15000}
                step={100}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-2 cursor-pointer accent-[#00A651]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-3 font-medium">
                <span>$1,000</span>
                <span>$15,000</span>
              </div>
            </div>
          )}

          {/* STEP 3: Bedrooms */}
          {step === 3 && (
            <div>
              {[
                { value: "0", label: "Studio" },
                { value: "1", label: "1 Bedroom" },
                { value: "2", label: "2 Bedrooms" },
                { value: "3+", label: "3+ Bedrooms" },
              ].map((opt) => (
                <OptionCard key={opt.value} selected={bedrooms === opt.value} onClick={() => setBedrooms(opt.value)}>
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          )}

          {/* STEP 4: Bathrooms */}
          {step === 4 && (
            <div>
              {[
                { value: "1", label: "1 Bathroom" },
                { value: "1.5", label: "1.5 Bathrooms" },
                { value: "2+", label: "2+ Bathrooms" },
              ].map((opt) => (
                <OptionCard key={opt.value} selected={bathrooms === opt.value} onClick={() => setBathrooms(opt.value)}>
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          )}

          {/* STEP 5: Pets */}
          {step === 5 && (
            <div>
              {[
                { value: "none", label: "No pets" },
                { value: "cats", label: "Cats" },
                { value: "dogs", label: "Dogs" },
                { value: "both", label: "Both cats and dogs" },
              ].map((opt) => (
                <OptionCard key={opt.value} selected={pets === opt.value} onClick={() => setPets(opt.value)}>
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          )}

          {/* STEP 6: Amenities */}
          {step === 6 && (
            <div>
              {[
                { value: "washer_dryer", label: "W/D in unit" },
                { value: "elevator", label: "Elevator" },
                { value: "doorman", label: "Doorman" },
                { value: "gym", label: "Gym" },
              ].map((opt) => (
                <OptionCard key={opt.value} selected={amenities.includes(opt.value)} onClick={() => setAmenities(toggleArray(amenities, opt.value))} type="checkbox">
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          )}

          {/* STEP 7: Timing */}
          {step === 7 && (
            <div>
              {[
                { value: "asap", label: "ASAP - I need to move soon" },
                { value: "30days", label: "Within 30 days" },
                { value: "researching", label: "Just researching for now" },
              ].map((opt) => (
                <OptionCard key={opt.value} selected={timing === opt.value} onClick={() => setTiming(opt.value)}>
                  {opt.label}
                </OptionCard>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="py-4 px-6 rounded-xl bg-white/20 backdrop-blur-sm text-white font-bold border border-white/30 hover:bg-white/30 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all ${
              canContinue()
                ? 'bg-[#00A651] text-white shadow-lg shadow-black/20 hover:bg-[#00913f] active:scale-[0.98]'
                : 'bg-white/20 text-white/40 cursor-not-allowed'
            }`}
          >
            {step === 7 ? "Find My Perfect Match" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
