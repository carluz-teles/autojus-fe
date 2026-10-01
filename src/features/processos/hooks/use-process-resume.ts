"use client";
import { useProcessResumeRequest } from "./_private/use-process-resume";

export function useProcessResume(id: string) {
  return useProcessResumeRequest(id);
}
