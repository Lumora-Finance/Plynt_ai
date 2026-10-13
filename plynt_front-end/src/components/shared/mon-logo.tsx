import { cn } from "@/lib/utils";

/**
 * MonLogo — Monad blockchain logo + "MON" text
 *
 * Usage:
 *   <MonLogo />                  // default: logo + "MON" text inline
 *   <MonLogo size="lg" />        // larger
 *   <MonLogo showText={false} /> // logo only
 *   <MonLogo className="..." />  // custom wrapper class
 */
export function MonLogo({
  size = "md",
  showText = true,
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}) {
  const imgSize = {
    xs: "size-3.5",
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-8",
  }[size];

  const textSize = {
    xs: "text-[11px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <img
        src="/mon-logo.png"
        alt="MON"
        className={cn(imgSize, "rounded-full object-cover")}
        draggable={false}
      />
      {showText && (
        <span className={cn("font-semibold leading-none", textSize)}>MON</span>
      )}
    </span>
  );
}
