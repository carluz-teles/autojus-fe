"use client";

import { useEffect, useState } from "react";

export function useAnnotationNavigation(dirty: boolean) {
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function click(event: MouseEvent) {
      const link = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      if (
        link.origin === location.origin &&
        link.pathname === location.pathname &&
        link.search === location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(link.href);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  function stay() {
    setDestination(null);
  }
  function changeOpen(open: boolean) {
    if (!open) stay();
  }
  // Full navigation intentionally retains the browser's last warning if edits
  // remain unsaved. No private form data is persisted in local/session storage.
  function leave() {
    if (destination) window.location.assign(destination);
  }
  return { destination, stay, leave, changeOpen };
}
