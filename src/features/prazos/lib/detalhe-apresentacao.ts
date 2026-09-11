import type { PrazoDetalheView } from "../types";
import { tipoIncompativelComPrazo } from "./confirmacao";

export function formatarCNJ(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 20
    ? digits.replace(
        /^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/,
        "$1-$2.$3.$4.$5.$6",
      )
    : value;
}

export function documentoOrigemUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function feriadosVigentes(p: PrazoDetalheView) {
  const detalhes = p.applied_holiday ?? [];
  if (!p.confirmed) return detalhes;
  return (p.holidays_applied ?? []).map(
    (data) =>
      detalhes.find((h) => h.data.slice(0, 10) === data.slice(0, 10)) ?? {
        data,
        nome: "Feriado ou suspensão",
        ambito: "",
      },
  );
}

export function dataEscolhidaNaApuracao(p: PrazoDetalheView): boolean {
  return ["aceita_calculado", "ajuste_manual"].includes(
    p.cross_validation?.decisao ?? "",
  );
}

export function situacaoRevisao(p: PrazoDetalheView | null, estado: string) {
  if (!p) return { label: "Prazo não disponível", pendente: false };
  if (p.status === "CANCELLED")
    return { label: "Prazo cancelado", pendente: false };
  if (p.status === "MET") return { label: "Prazo cumprido", pendente: false };
  if (
    p.origem !== "declarado" &&
    p.cross_validation?.resultado === "divergente" &&
    !p.cross_validation.decisao
  )
    return { label: "Divergência pendente", pendente: true };
  if (p.confirmed)
    return {
      label:
        p.status === "NO_DEADLINE"
          ? "Ausência de prazo revisada"
          : "Prazo revisado",
      pendente: false,
    };
  if (tipoIncompativelComPrazo(p))
    return { label: "Tipo incompatível com prazo · revisar", pendente: true };
  if (estado === "a_classificar")
    return {
      label:
        p.origem === "declarado" ? "Tipo a definir" : "Tipo e prazo a definir",
      pendente: true,
    };
  if (estado === "ia")
    return {
      label:
        p.origem === "declarado"
          ? "Tipo a confirmar"
          : "Tipo e prazo a confirmar",
      pendente: true,
    };
  if (p.status === "NO_DEADLINE")
    return { label: "Sem prazo identificado", pendente: false };
  if (p.origem === "declarado")
    return { label: "Prazo declarado aceito", pendente: false };
  return {
    label: p.confirmacao_exigida
      ? "Revisão pendente"
      : "Sem pendência de revisão",
    pendente: p.confirmacao_exigida,
  };
}
