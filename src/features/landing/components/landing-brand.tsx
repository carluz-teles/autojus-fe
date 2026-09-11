import { cn } from "@/lib/utils";

export function LandingBrand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={cn("lp-brand", inverted && "lp-brand-inverted")}>
      <span className="lp-brand-symbol" aria-hidden="true">
        A<span />
      </span>
      <span>
        AtJud<span className="lp-brand-dot">.</span>
      </span>
    </span>
  );
}
