"use client";

import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import {
  useAddWatchedOab,
  useToggleWatchedOab,
  useWatchedOabs,
} from "@/features/integrations/hooks/use-integrations";
import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { TermoCard } from "@/features/shared/components/termo-card";
import { diarioLabelPorUf } from "@/features/shared/lib/diario";
import { ApiError } from "@/lib/api/errors";

// ——— helpers ———

/**
 * Parseia rascunho → chave CANÔNICA no formato do BE "UFNUMERO" (ex.: "SP123456")
 * ou null se inválido. É esse o formato que o BE valida em POST /v1/acquisition/
 * watched-oabs (regex ^[A-Z]{2}\d{1,6}$, sem barra) e devolve em GET — dedup e
 * adição usam esta chave. A exibição é reformatada por formatOab (ver abaixo).
 */
function parseOabInput(raw: string): { chave: string; uf: string } | null {
  const bruto = raw.trim().toUpperCase();
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
  const { mutateAsync: addOab } = useAddWatchedOab();
  const { mutateAsync: toggleOab, isPending: isToggling } =
    useToggleWatchedOab();

  // OABs actuais (chaves canônicas "UFNUMERO") só para dedup no client.
  const oabsAtuais = useMemo(() => data?.data.map((r) => r.oab) ?? [], [data]);

  // ——— estado local: chips (OABs prontas pra enviar) + rascunho (em digitação) ———
  const [chips, setChips] = useState<string[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Espaço/Enter transformam o rascunho válido em chip — dedup contra os chips já
  // na lista E contra as OABs reais do BE (mesmo formato canônico "UFNUMERO").
  const tentarChipar = useCallback(() => {
    const texto = rascunho.trim();
    if (!texto) return;
    const parsed = parseOabInput(texto);
    if (!parsed) {
      toast.error(
        "OAB inválida. Use UF + número (ex.: SP123456 ou 123456/SP).",
      );
      return;
    }
    if (chips.includes(parsed.chave) || oabsAtuais.includes(parsed.chave)) {
      toast.error(`OAB ${formatOab(parsed.chave)} já está na lista.`);
      setRascunho("");
      return;
    }
    setChips((prev) => [...prev, parsed.chave]);
    setRascunho("");
  }, [rascunho, chips, oabsAtuais]);

  const removerChip = useCallback((chave: string) => {
    setChips((prev) => prev.filter((c) => c !== chave));
  }, []);

  // Adicionar envia TODAS as OABs pendentes (chips + o que sobrou digitado) — uma
  // requisição por OAB (POST /v1/acquisition/watched-oabs não é batch), SEQUENCIAL
  // (não em paralelo): cada addOab já invalida a lista no sucesso, e disparar N
  // invalidações concorrentes contra a MESMA query key corrida o refetch — o cache
  // do BE fica certo, mas o componente não reflete o resultado sem um reload manual.
  // Sequencial garante que cada invalidação/refetch termina antes da próxima
  // requisição começar, então a UI sempre acaba consistente sem reload.
  const adicionar = useCallback(async () => {
    let pendentes = chips;
    const texto = rascunho.trim();
    if (texto) {
      const parsed = parseOabInput(texto);
      if (!parsed) {
        toast.error(
          "OAB inválida. Use UF + número (ex.: SP123456 ou 123456/SP).",
        );
        return;
      }
      if (
        !pendentes.includes(parsed.chave) &&
        !oabsAtuais.includes(parsed.chave)
      ) {
        pendentes = [...pendentes, parsed.chave];
      }
    }
    if (pendentes.length === 0) return;

    setChips([]);
    setRascunho("");
    setIsSubmittingBatch(true);
    const falhas: unknown[] = [];
    for (const chave of pendentes) {
      try {
        await addOab(chave);
      } catch (err) {
        falhas.push(err);
      }
    }
    setIsSubmittingBatch(false);

    const sucessos = pendentes.length - falhas.length;
    if (sucessos > 0) {
      toast.success(
        sucessos === 1
          ? `OAB ${formatOab(pendentes[0])} adicionada — varredura iniciada.`
          : `${sucessos} OABs adicionadas — varredura iniciada.`,
      );
    }
    if (falhas.length > 0) {
      const err = falhas[0];
      const msg =
        err instanceof ApiError && err.kind === "FORBIDDEN"
          ? "Sem permissão para alterar os termos monitorados."
          : err instanceof ApiError && err.kind === "VALIDATION"
            ? "Formato de OAB inválido."
            : falhas.length === 1
              ? "Não foi possível adicionar a OAB. Tente novamente."
              : `${falhas.length} OABs não puderam ser adicionadas. Tente novamente.`;
      toast.error(msg);
    }
  }, [chips, rascunho, oabsAtuais, addOab]);

  const alternar = useCallback(
    async (oab: string, enabled: boolean) => {
      try {
        await toggleOab({ oab, enabled });
        toast.success(
          enabled
            ? `Captura de ${formatOab(oab)} reativada — varredura do período iniciada.`
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

      {/* Formulário de adição — visível apenas para admin. Digite uma OAB e aperte
          espaço (ou Enter) pra virar chip; dá pra empilhar várias antes de
          clicar Adicionar, que envia todas de uma vez. */}
      {isAdmin ? (
        <>
          <div className="mt-4.5 flex gap-2">
            <div className="border-input bg-card focus-within:ring-ring/40 flex min-h-9 flex-1 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 focus-within:ring-2">
              {chips.map((chave) => (
                <span
                  key={chave}
                  className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-[12.5px] tabular-nums"
                >
                  {formatOab(chave)}
                  <button
                    type="button"
                    onClick={() => removerChip(chave)}
                    aria-label={`Remover ${formatOab(chave)}`}
                    className="text-muted-foreground hover:text-destructive rounded-sm p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    if (rascunho.trim()) tentarChipar();
                    else if (e.key === "Enter") void adicionar();
                  } else if (
                    e.key === "Backspace" &&
                    rascunho === "" &&
                    chips.length > 0
                  ) {
                    removerChip(chips[chips.length - 1]);
                  }
                }}
                placeholder={
                  chips.length === 0 ? "ex.: SP123456" : "outra OAB…"
                }
                disabled={isSubmittingBatch}
                className="placeholder:text-muted-foreground/70 min-w-32 flex-1 bg-transparent text-[13px] outline-none"
              />
            </div>
            <Button
              className="shrink-0"
              onClick={() => void adicionar()}
              disabled={
                isSubmittingBatch || (chips.length === 0 && !rascunho.trim())
              }
            >
              {isSubmittingBatch
                ? "Adicionando…"
                : chips.length > 0
                  ? `Adicionar (${chips.length})`
                  : "Adicionar"}
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-[11.5px]">
            UF em maiúsculas + número de inscrição. Espaço vira chip — dá pra
            adicionar várias de uma vez.
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
