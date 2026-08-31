"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SESSIONS_KEY = ["clerk", "sessions"] as const;

function relativo(d?: Date | null): string {
  if (!d) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "ativa agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  return `há ${dias} dia${dias > 1 ? "s" : ""}`;
}

// Card "Sessões ativas" do Perfil (Clerk headless user.getSessions + revoke). A
// sessão atual é marcada e não pode ser encerrada por aqui (o Clerk recusa
// revogar a própria); para sair dela use o menu do usuário. Revogar invalida a
// lista (React Query) pra a UI refletir na hora.
export function usePerfilSessoes() {
  const { user } = useUser();
  const { sessionId } = useAuth();
  const qc = useQueryClient();
  const [revogandoId, setRevogandoId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => user!.getSessions(),
    enabled: !!user,
  });

  // Tipo do elemento derivado do retorno de user.getSessions() — evita depender
  // de @clerk/types (não instalado); o item já traz .revoke().
  const revogarMut = useMutation({
    mutationFn: (s: NonNullable<typeof query.data>[number]) => s.revoke(),
    onSuccess: () => {
      toast.success("Sessão encerrada.");
      void qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
    onError: () => toast.error("Não foi possível encerrar a sessão."),
    onSettled: () => setRevogandoId(null),
  });

  const sessoes = useMemo(
    () =>
      (query.data ?? [])
        .map((s) => {
          const a = s.latestActivity;
          const atual = s.id === sessionId;
          const dispositivo =
            [a?.browserName, a?.deviceType].filter(Boolean).join(" · ") ||
            "Dispositivo desconhecido";
          const local = [a?.city, a?.country].filter(Boolean).join(", ");
          return {
            id: s.id,
            atual,
            dispositivo,
            detalhe:
              [local, a?.ipAddress].filter(Boolean).join(" · ") ||
              "local desconhecido",
            quando: atual ? "esta sessão" : relativo(s.lastActiveAt),
            revogar: () => {
              setRevogandoId(s.id);
              revogarMut.mutate(s);
            },
            revogando: revogandoId === s.id,
          };
        })
        .sort((x, y) => Number(y.atual) - Number(x.atual)),
    [query.data, sessionId, revogandoId, revogarMut],
  );

  return {
    sessoes,
    isPending: query.isPending,
    isError: query.isError,
  };
}
