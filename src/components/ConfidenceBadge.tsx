export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 85 ? "text-emerald-300 bg-emerald-500/15" : pct >= 70 ? "text-amber-300 bg-amber-500/15" : "text-slate-300 bg-white/10";
  return (
    <span className={`chip ${tone}`} title="AI confidence this is a real, actionable signal">
      <Dot /> {pct}% confidence
    </span>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}
