"use client";

import { type KeyboardEvent, useState } from "react";

export function useLandingNavigation() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((current) => !current);
  const close = () => setOpen(false);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget
        .querySelector<HTMLButtonElement>(
          "[aria-controls='landing-mobile-nav']",
        )
        ?.focus();
    }
  };
  return { open, toggle, close, onKeyDown };
}
