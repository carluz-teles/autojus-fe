// Contexto normalizado do rail da Construção — a MESMA forma alimenta a tela com
// ou sem draft: vem de um `Draft` (construção, pós-geração) OU do detalhe de uma
// intimação (partida, pré-geração). Assim o rail rico (ContextRail) é único: a
// partida deixa de ser uma tela paralela e mais pobre.

import type { Draft } from "../types";

export interface PecaContextoProcesso {
  cnj: string;
  classe: string;
  assunto: string;
  orgao: string;
  tribunalGrau: string;
  /** "" quando desconhecido (a intimação não carrega o valor da causa). */
  valor: string;
}

export interface PecaContextoIntimacao {
  /** id da intimação — usado como id do item "Intimação de origem" na Fundada em. */
  id: string;
  tipoLabel: string;
  publishedAt: string;
  /** Rótulo do prazo (data "DD/MM/AAAA" no draft, ou "10 dias restantes" na partida). */
  prazoLabel: string;
  teor: string;
}

export interface PecaContextoParte {
  roleLabel: string;
  name: string;
  counselLabel: string;
  isClient: boolean;
}

export interface PecaContextoDoc {
  id: string;
  name: string;
  /** Linha secundária (tamanho do anexo, "fls. X–Y", etc.). */
  meta: string;
  category: string;
}

export interface PecaContexto {
  processo: PecaContextoProcesso;
  intimacao: PecaContextoIntimacao;
  partes: PecaContextoParte[];
  /** Documentos do caso (autos) exibidos na "Fundada em" — SEM o Teor, que o rail
   *  injeta sempre como 1º item. Vazio na partida (ainda não há anexos do draft). */
  autos: PecaContextoDoc[];
}

/** Draft (construção) → contexto do rail. */
export function draftToPecaContexto(d: Draft): PecaContexto {
  return {
    processo: {
      cnj: d.process.cnj,
      classe: d.process.classe,
      assunto: d.process.assunto,
      orgao: d.process.orgao,
      tribunalGrau: d.process.tribunalGrau,
      valor: d.process.valor,
    },
    intimacao: {
      id: d.intimation.id,
      tipoLabel: d.intimation.title,
      publishedAt: d.intimation.publishedAt,
      prazoLabel: d.deadline.endDate,
      teor: d.intimation.teor,
    },
    partes: d.partyGroups.map((p) => ({
      roleLabel: p.roleLabel,
      name: p.name,
      counselLabel: p.counselLabel,
      isClient: p.isClient,
    })),
    // "Fundada em" lista, além do teor (injetado pelo rail): os AUTOS do processo
    // (documentos fetchados do court_record — o que a geração ancora via RAG) e, em
    // seguida, os anexos manuais. Os autos vêm primeiro por serem a base da peça.
    autos: [
      ...d.processDocuments.map((doc) => ({
        id: doc.id,
        name: doc.label,
        // Tipo (enriquecido) · data do evento · páginas — a data fica AQUI, fora do
        // nome, pra desambiguar documentos do mesmo tipo. Partes vazias são omitidas.
        meta: [
          doc.typeLabel || doc.documentType,
          doc.eventDate,
          `${doc.pages} pág.`,
        ]
          .filter(Boolean)
          .join(" · "),
        category: "Autos",
      })),
      ...d.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        meta: a.sizeLabel,
        category: a.category,
      })),
    ],
  };
}
