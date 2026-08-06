"use client";

import { useAuth } from "@clerk/nextjs";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { notificationKeys } from "./notification-keys";
import type { NotificationView } from "./types";

const STREAM_PATH = "/v1/notifications/stream";
const EVENT_STREAM = "text/event-stream";

// useNotificationStream mantém uma conexão SSE aberta enquanto o usuário está logado
// e recebe cada aviso empurrado pelo BE (GET /v1/notifications/stream). Cada push
// vira um toast e invalida as queries de notificações (badge + lista da 3a).
//
// O EventSource nativo não seta Authorization; por isso usamos fetch-event-source com
// um `fetch` custom que injeta um token Clerk FRESCO a cada (re)conexão — os tokens
// expiram, então uma reconexão pós-expiração pega um token novo sozinha. Heartbeats do
// servidor (comentários `: ping`) não chegam como onmessage: o parser SSE os ignora.
export function useNotificationStream() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL ?? ""}${STREAM_PATH}`;
    const ctrl = new AbortController();

    void fetchEventSource(url, {
      signal: ctrl.signal,
      // Segue recebendo com a aba em segundo plano (aviso não pode depender de foco).
      openWhenHidden: true,
      // Token novo por tentativa de conexão: fetch-event-source chama isto no connect
      // inicial e em cada retry.
      fetch: async (input, init) => {
        const token = await getToken();
        return fetch(input, {
          ...init,
          headers: { ...init?.headers, Authorization: `Bearer ${token}` },
        });
      },
      onopen: async (res) => {
        if (
          res.ok &&
          res.headers.get("content-type")?.startsWith(EVENT_STREAM)
        ) {
          return;
        }
        // Qualquer não-2xx (ex.: 401 de token expirado) é lançado para cair no onerror,
        // que deixa o fetch-event-source retentar — o `fetch` acima renova o token.
        throw new Error(`notifications stream: HTTP ${res.status}`);
      },
      onmessage: (ev) => {
        if (ev.event !== "notification" || !ev.data) return;
        let n: NotificationView;
        try {
          n = JSON.parse(ev.data) as NotificationView;
        } catch {
          return; // payload malformado nunca trava o stream
        }
        toast(n.title, { description: n.body });
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      },
      onerror: () => {
        // Não relança: retorno vazio mantém o retry com backoff padrão (o servidor caiu,
        // token expirou, rede oscilou). Lançar aqui encerraria o stream de vez.
      },
    }).catch(() => {
      // A única rejeição esperada é o abort no unmount; ignorar.
    });

    return () => ctrl.abort();
  }, [isSignedIn, getToken, queryClient]);
}
