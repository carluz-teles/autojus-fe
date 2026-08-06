"use client";

import { useNotificationStream } from "./use-notification-stream";

// NotificationStream é o ponto de montagem do stream SSE: um client component sem UI
// que só roda o hook. Fica no shell autenticado (uma vez), então a conexão persiste
// pelas navegações e só existe quando há sessão. O toast e o badge são renderizados
// em outros lugares (Toaster global / sino).
export function NotificationStream() {
  useNotificationStream();
  return null;
}
