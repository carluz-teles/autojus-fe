"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import { recordFeedbackExposure } from "../../services/feedback";

export function useFeedbackExposure(result: string, enabled: boolean) {
  const api = useApi();
  const element = useRef<HTMLDivElement>(null);
  const observeCTA = useCallback((node: HTMLDivElement | null) => {
    element.current = node;
  }, []);
  const attemptedDay = useRef("");
  const { mutateAsync } = useMutation({
    mutationFn: (signal: AbortSignal) =>
      recordFeedbackExposure(api, result, signal),
    retry: false,
    gcTime: 0,
  });

  useEffect(() => {
    const node = element.current;
    if (!enabled || !node || typeof IntersectionObserver === "undefined")
      return;
    const controller = new AbortController();
    let intersecting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let nextDay: ReturnType<typeof setTimeout> | undefined;
    function visible() {
      return (
        intersecting &&
        document.visibilityState === "visible" &&
        !node!.closest('[hidden], [inert], [aria-hidden="true"]') &&
        getComputedStyle(node!).visibility !== "hidden"
      );
    }
    function observeDay() {
      clearTimeout(timer);
      clearTimeout(nextDay);
      if (!visible()) return;
      const day = new Date().toISOString().slice(0, 10);
      if (attemptedDay.current === day) {
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        nextDay = setTimeout(
          observeDay,
          Math.max(1, tomorrow.getTime() - Date.now()),
        );
        return;
      }
      timer = setTimeout(() => {
        if (!visible() || controller.signal.aborted) return;
        attemptedDay.current = new Date().toISOString().slice(0, 10);
        // Observation failure must neither retry in a loop nor affect the vote.
        void mutateAsync(controller.signal).catch(() => {});
        observeDay();
      }, 1000);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((entry) => entry.target === node);
        if (!entry) return;
        intersecting = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        observeDay();
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", observeDay);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", observeDay);
      clearTimeout(timer);
      clearTimeout(nextDay);
      controller.abort();
    };
  }, [enabled, result, mutateAsync]);

  return observeCTA;
}
