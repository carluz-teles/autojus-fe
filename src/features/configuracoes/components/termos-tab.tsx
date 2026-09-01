"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { Input } from "@/components/mock-ui/input";
import {
  useAddWatchedOab,
  useToggleWatchedOab,
  useWatchedOabs,
} from "@/features/integrations/hooks/use-integrations";
import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { TermoCard } from "@/features/shared/components/termo-card";
import { diarioLabelPorUf } from "@/features/shared/lib/diario";
import { ApiError } from "@/lib/api/errors";
import { maskOab } from "@/lib/masks";

// ——— helpers ———

/**
 * Parseia rascunho → chave CANÔNICA no formato do BE "UFNUMERO" (ex.: "SP123456")
 * ou null se inválido. É esse o formato que o BE valida em POST /v1/acquisition/
 * watched-oabs (regex ^[A-Z]{2}\d{1,6}$, sem barra) e devolve em GET — dedup e
 * adição usam esta chave. A exibição é reformatada por formatOab (ver abaixo).
 */
function parseOabInput(raw: string): { chave: string; uf: string } | null {
  const bruto = raw.trim().toUpperCase().replace(/\./g, "");
  const m =
    /^([A-Z]{2})\s*([0-9]{1,6})$/.exec(bruto) ??
    /^([0-9]{1,6})\/?([A-Z]{2})$/.exec(bruto);
  if (!m) return null;
  const uf = m[1].length === 2 ? m[1] : m[2];
  const numero = m[1].length === 2 ? m[2] : m[1];
  return { chave: `${uf}${numero}`, uf };
}

/** Reformata a chave canônica "UFNUMERO" para exibição "NUMERO/UF" (ex.: "347019/SP"). */
function formatOab(canonical: string): string {
  const m = /^([A-Z]{2})([0-9]{1,7})$/.exec(canonical);
  return m ? `${m[2]}/${m[1]}` : canonical;
}

// ——— Skeleton de carregamento (3 cards) ———

function TermosSkeleton() {
  return (
    <div className="mt-5 flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/40 h-24 animate-pulse rounded-xl border"
        />
      ))}
    </div>
  );
}

/** Termos monitorados: fonte de dados via GET /v1/acquisition/watched-oabs. */
export function TermosTab() {
  const { isAdmin } = useIsOrgAdmin();

  // ——— dados do servidor ———
  const { data, isLoading, isError } = useWatchedOabs();
  const { mutateAsync: addOab, isPending: isAdding } = useAddWatchedOab();
  const { mutateAsync: toggleOab, isPending: isToggling } =
    useToggleWatchedOab();

  // OABs actuais (chaves canônicas "UFNUMERO") só para dedup no client.
  const oabsAtuais = useMemo(() => data?.data.map((r) => r.oab) ?? [], [data]);

  // ——— estado local de rascunho ———
  const [rascunho, setRascunho] = useState("");

  // ——— ações ———

  const adicionar = useCallback(async () => {
    const parsed = parseOabInput(rascunho);
    if (!parsed) {
      toast.error(
        "OAB inválida. Use UF + número (ex.: SP123456 ou 123456/SP).",
      );
      return;
    }
    const { chave } = parsed;

    // dedup contra as OABs reais do BE (mesmo formato canônico "UFNUMERO")
    if (oabsAtuais.includes(chave)) {
      toast.error(`OAB ${formatOab(chave)} já está monitorada.`);
      setRascunho("");
      return;
    }

    try {
      await addOab(chave);
      setRascunho("");
      toast.success(`OAB ${formatOab(chave)} adicionada — varredura iniciada.`);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.kind === "FORBIDDEN"
          ? "Sem permissão para alterar os termos monitorados."
          : err instanceof ApiError && err.kind === "VALIDATION"
            ? "Formato de OAB inválido."
            : "Não foi possível adicionar a OAB. Tente novamente.";
      toast.error(msg);
    }
  }, [rascunho, oabsAtuais, addOab]);

  const alternar = useCallback(
    async (oab: string, enabled: boolean) => {
      try {
        await toggleOab({ oab, enabled });
        toast.success(
          enabled
            ? `Captura de ${formatOab(oab)} reativada — varredura de catch-up iniciada.`
            : `Captura de ${formatOab(oab)} desativada.`,
        );
      } catch (err) {
        const msg =
          err instanceof ApiError && err.kind === "FORBIDDEN"
            ? "Sem permissão para alterar os termos monitorados."
            : "Não foi possível atualizar a OAB. Tente novamente.";
        toast.error(msg);
      }
    },
    [toggleOab],
  );

  // ——— render ———

  return (
    <section className="mt-7 max-w-4xl">
      <h2 className="font-display text-lg font-medium">Termos monitorados</h2>
      <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
        As inscrições abaixo guiam a captura no DJEN. CNPJs e nomes de parte
        entram em breve. Alterações valem para as próximas capturas — a diária
        continua sozinha.
      </p>

      {/* Formulário de adição — visível apenas para admin */}
      {isAdmin ? (
        <>
          <div className="mt-4.5 flex gap-2">
            <Input
              value={rascunho}
              onChange={(e) => setRascunho(maskOab(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void adicionar();
              }}
              placeholder="ex.: SP123456"
              disabled={isAdding}
            />
            <Button
              className="shrink-0"
              onClick={() => void adicionar()}
              disabled={isAdding}
            >
              {isAdding ? "Adicionando…" : "Adicionar"}
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-[11.5px]">
            UF em maiúsculas + número de inscrição.
          </p>
        </>
      ) : null}

      {/* Estados: loading / erro / lista / vazio */}
      {isLoading ? (
        <TermosSkeleton />
      ) : isError ? (
        <p role="alert" className="text-destructive mt-5 text-sm">
          Não foi possível carregar os termos monitorados. Tente novamente.
        </p>
      ) : oabsAtuais.length === 0 ? (
        <p className="border-border text-muted-foreground mt-5 rounded-xl border border-dashed p-6 text-center text-[13px]">
          Nenhuma inscrição monitorada — sem OAB não há captura.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {data!.data.map((item) => {
            // `item.oab` é a chave canônica "UFNUMERO"; UF = as duas primeiras letras.
            const uf = item.oab.slice(0, 2);
            const display = formatOab(item.oab);
            return (
              <TermoCard
                key={item.oab}
                titular={item.name ?? undefined}
                oab={display}
                temCertificado={false}
                enabled={item.enabled}
                lastAction={item.last_action}
                lastActionAt={item.last_action_at}
                toggleDisabled={isToggling}
                onToggleEnabled={
                  isAdmin
                    ? (enabled) => void alternar(item.oab, enabled)
                    : undefined
                }
                diarios={[
                  {
                    nome: diarioLabelPorUf(uf),
                    fontes: ["DJEN"],
                  },
                ]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
