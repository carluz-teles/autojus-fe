"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  cnjCurto,
  dec,
  iniciais,
  type PrazoDec,
  stageLabel,
  urg,
} from "../lib/derivar";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

// Classe processual inferida da providência — port de _classeDe do mockup.
// Duplicado aqui de propósito: o original é privado do use-processo-hub e os
// arquivos compartilhados não podem ser editados.
function classeDe(prov: string): string {
  if (/Apela|Agravo|Inominado|Contrarraz/.test(prov)) return "Recurso";
  if (/Cumprimento|Impugna|Execu/.test(prov)) return "Execução";
  if (/Contesta|Réplica|Tréplica/.test(prov)) return "Conhecimento";
  return "Instrução";
}

// Uma linha do Acervo · Processos: um processo (agrupado por CNJ), com o prazo
// mais urgente à frente e a contagem de intimações ativas.
export interface AcervoProcessoRow {
  cnj: string;
  cnjCurto: string;
  cliente: string;
  classe: string;
  orgao: string;
  resp: string;
  respIniciais: string;
  ativas: number;
  faseK: PrazoDec["stage"];
  faseLabel: string;
  prazoCurto: string;
  urgCor: string;
  urgK: PrazoDec["urgK"];
}

// Hook público do Acervo · Processos. Agrupa os prazos do mock por CNJ (um
// processo por linha), escolhendo o prazo em andamento mais próximo como
// representante da linha. O componente só faz JSX + binding.
export function useAcervoProcessos() {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });

  const todos = useMemo(() => query.data ?? [], [query.data]);

  const rows = useMemo<AcervoProcessoRow[]>(() => {
    const porCnj = new Map<string, typeof todos>();
    for (const p of todos) {
      const grupo = porCnj.get(p.cnj) ?? [];
      grupo.push(p);
      porCnj.set(p.cnj, grupo);
    }

    return Array.from(porCnj.values())
      .map((grupo) => {
        const ativos = grupo.filter((p) => p.stage !== "protocolado");
        const rep =
          [...(ativos.length ? ativos : grupo)].sort(
            (a, b) => a.dias - b.dias,
          )[0] ?? grupo[0];
        const u = urg(rep.dias);
        return {
          cnj: rep.cnj,
          cnjCurto: cnjCurto(rep.cnj),
          cliente: rep.cliente,
          classe: classeDe(rep.providencia),
          orgao: rep.orgao,
          resp: rep.resp,
          respIniciais: iniciais(rep.resp),
          ativas: ativos.length,
          faseK: rep.stage,
          faseLabel: stageLabel(rep.stage),
          prazoCurto: dec(rep).prazoCurto,
          urgCor: u.cor,
          urgK: u.k,
        };
      })
      .sort((a, b) => a.cliente.localeCompare(b.cliente, "pt-BR"));
  }, [todos]);

  return {
    isLoading: query.isLoading,
    rows,
    total: rows.length.toLocaleString("pt-BR"),
  };
}
