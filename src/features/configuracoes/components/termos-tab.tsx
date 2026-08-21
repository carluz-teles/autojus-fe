"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { Input } from "@/components/mock-ui/input";
import {
  useUpdateIntegrationScope,
  useWatchedOabs,
} from "@/features/integrations/hooks/use-integrations";
import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { TermoCard } from "@/features/shared/components/termo-card";
import { diarioLabelPorUf } from "@/features/shared/lib/diario";
import { ApiError } from "@/lib/api/errors";

// ——— helpers ———

/**
 * Parseia rascunho → chave CANÔNICA no formato do BE "UFNUMERO" (ex.: "SP123456")
 * ou null se inválido. É esse o formato que o scope.oab guarda/retorna e que o
 * regex do BE (^[A-Z]{2}\d{1,6}$) valida — dedup, POST e remoção usam esta chave.
 * A exibição é reformatada por formatOab (ver abaixo).
 */
function parseOabInput(raw: string): { chave: string; uf: string } | null {
  const bruto = raw.trim().toUpperCase();
  const m =
    /^([A-Z]{2})\s*([0-9]{4,6})$/.exec(bruto) ??
    /^([0-9]{4,6})\/?([A-Z]{2})$/.exec(bruto);
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
  // useWatchedOabs é a fonte primária: traz a lista de OABs COM o nome derivado
  // de party_counsel. useUpdateIntegrationScope continua sendo o write path
  // (POST /v1/acquisition/integrations com o scope completo).
  const { data, isLoading, isError } = useWatchedOabs();
  const { mutateAsync: updateScope, isPending } = useUpdateIntegrationScope();

  // OABs actuais (chaves canônicas "UFNUMERO") para dedup e montagem do scope.
  const oabsAtuais = useMemo(() => data?.data.map((r) => r.oab) ?? [], [data]);

  // ——— estado local de rascunho ———
  const [rascunho, setRascunho] = useState("");

  // ——— ações ———

  const adicionar = useCallback(async () => {
    const parsed = parseOabInput(rascunho);
    if (!parsed) {
      setRascunho("");
      return;
    }
    const { chave } = parsed;

    // dedup contra as OABs reais do BE (mesmo formato canônico "UFNUMERO")
    if (oabsAtuais.includes(chave)) {
      setRascunho("");
      return;
    }

    const novasOabs = [...oabsAtuais, chave];
    try {
      await updateScope({ oab: novasOabs });
      setRascunho("");
      toast.success(`OAB ${formatOab(chave)} adicionada.`);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.kind === "FORBIDDEN"
          ? "Sem permissão para alterar os termos monitorados."
          : "Não foi possível adicionar a OAB. Tente novamente.";
      toast.error(msg);
    }
  }, [rascunho, oabsAtuais, updateScope]);

  const remover = useCallback(
    async (oab: string) => {
      const novasOabs = oabsAtuais.filter((o) => o !== oab);
      try {
        await updateScope({ oab: novasOabs });
        toast.success(`OAB ${formatOab(oab)} removida.`);
      } catch (err) {
        const msg =
          err instanceof ApiError && err.kind === "FORBIDDEN"
            ? "Sem permissão para alterar os termos monitorados."
            : "Não foi possível remover a OAB. Tente novamente.";
        toast.error(msg);
      }
    },
    [oabsAtuais, updateScope],
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
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void adicionar();
              }}
              placeholder="ex.: SP123456"
              disabled={isPending}
            />
            <Button
              className="shrink-0"
              onClick={() => void adicionar()}
              disabled={isPending}
            >
              {isPending ? "Adicionando…" : "Adicionar"}
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
              // Para não-admin, oculta o botão X via CSS sem modificar TermoCard.
              <div
                key={item.oab}
                className={
                  !isAdmin
                    ? "[&_button[title='Remover inscrição']]:hidden"
                    : undefined
                }
              >
                <TermoCard
                  titular={item.name ?? undefined}
                  oab={display}
                  temCertificado={false}
                  diarios={[
                    {
                      nome: diarioLabelPorUf(uf),
                      fontes: ["DJEN"],
                    },
                  ]}
                  onRemover={() => {
                    void remover(item.oab);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
