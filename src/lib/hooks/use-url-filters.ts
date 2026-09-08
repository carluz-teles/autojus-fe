"use client";
import { useSearchParams } from "next/navigation";

/** URL-backed filters survive back navigation, reload and shared links. */
export function useUrlFilters() {
  const params = useSearchParams();
  return {
    get: (key: string) => params.get(key) ?? "",
    set: (values: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${next.size ? `?${next}` : ""}`,
      );
    },
  };
}
