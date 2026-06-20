import { cn } from "@/lib/utils";

/**
 * Compact stat: big number + short label, optional accent + trailing visual
 * (sparkline/icon). For de-prosing cards — a number says more than a sentence.
 */
export function MetricChip({
  value,
  label,
  accent = "text-primary",
  trailing,
  className,
}: {
  value: React.ReactNode;
  label: string;
  accent?: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("skeu-sm flex items-center justify-between gap-3 rounded-xl px-4 py-3", className)}>
      <div className="min-w-0">
        <div className={cn("text-2xl font-black leading-none", accent)}>{value}</div>
        <div className="mt-1 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      {trailing}
    </div>
  );
}
