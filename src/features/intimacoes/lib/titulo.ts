// Título de exibição de uma intimação — derivado da classe processual + assunto
// (court_record.class / .subject), normalizados. Usado tanto na linha da lista
// quanto no painel lateral e na tela de detalhe (Regra nº1: uma só fonte).

import type { IntimacaoType } from "../types";
import { TYPE_LABEL } from "./labels";

/** Remove o prefixo redundante "Processo <CNJ> - " do começo do teor (o número
 * do processo já é exibido logo abaixo do título). Fallback quando não há classe. */
export function semPrefixoProcesso(texto: string): string {
  const semPrefixo = texto.replace(/^Processo\s+[\d.\-]+\s*(?:[-–]\s*)?/i, "");
  return semPrefixo.trim() || texto;
}

// Palavras que ficam minúsculas no meio do título (preposições/artigos).
const TITULO_MINUSCULAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "à",
  "às",
  "ao",
  "aos",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "por",
  "com",
  "para",
]);

/** Normaliza a caixa para title-case pt-BR — a fonte (DJEN/DATAJUD) devolve
 * class/subject ora em Title Case, ora em CAIXA ALTA com acento quebrado
 * ("EXECUçãO DE TíTULO"). toLowerCase corrige os acentos; depois capitaliza. */
export function tituloCase(texto: string): string {
  return texto
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && TITULO_MINUSCULAS.has(w)
        ? w
        : w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1),
    )
    .join(" ");
}

/** Forma mínima que os três consumidores (linha, painel, detalhe) satisfazem. */
interface TituloFonte {
  class: string;
  subject: string;
  content_preview?: string;
  type: IntimacaoType;
}

/** Título da intimação: classe processual (+ assunto quando houver), normalizados.
 * Cai para o teor (sem o prefixo "Processo <CNJ>") quando não há classe, e para
 * o rótulo do tipo em último caso. */
export function tituloIntimacao(item: TituloFonte): string {
  const cls = item.class?.trim();
  if (!cls) {
    return item.content_preview
      ? semPrefixoProcesso(item.content_preview)
      : TYPE_LABEL[item.type];
  }
  const subj = item.subject?.trim();
  return subj ? `${tituloCase(cls)} · ${tituloCase(subj)}` : tituloCase(cls);
}
