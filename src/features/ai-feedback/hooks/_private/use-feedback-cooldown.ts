"use client";

import { useEffect, useState } from "react";

export function useFeedbackCooldown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => {
    if (!until) return;
    const immediate = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [until]);
  return remaining;
}
