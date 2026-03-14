/**
 * Shared progress bar for the onboarding flow (steps 8–12, continuing from /flow steps 1–7).
 * Total journey = 12 steps.
 */
export function OnboardingProgress({
  step,
  total = 12,
}: {
  step: number;
  total?: number;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-7 pt-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white/50 font-medium">Step {step} of {total}</span>
        <span className="text-xs text-white/35">{pct}%</span>
      </div>
      <div className="h-px bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00A651] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
