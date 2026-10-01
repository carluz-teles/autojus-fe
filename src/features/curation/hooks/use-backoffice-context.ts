"use client";

import { createContext, useContext } from "react";

import type { BackofficeSession } from "../services/backoffice";

export const BackofficeContext = createContext<BackofficeSession | null>(null);

export function useBackofficeContext() {
  const session = useContext(BackofficeContext);
  if (!session) throw new Error("Sessão interna necessária.");
  return session;
}
