import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { situacaoRevisao } from "../../lib/detalhe-apresentacao";
import type { PrazoDetalheView } from "../../types";
import { PainelPrazo } from "./intimacao-detalhe";

// PainelPrazo → (quando excecaoClassificacao) <DefinirTipoAto> → useDefinirTipo
// → useApi → useAuth (Clerk). Mesmo mock escopado a este arquivo já usado em
// disposicao-section.test.tsx — sem harness novo.
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => null }),
}));

// Caso real 018f8dd1: deadline OPEN, tipo_ato='indeterminado', selo='a_apurar'
// (piso supletivo CPC 218§3), confirmacao_exigida=true, 0 action_items.
function prazoFixture018f(
  over: Partial<PrazoDetalheView> = {},
): PrazoDetalheView {
  return {
    id: "cea58159-0000-0000-0000-000000000000",
    tipo_ato: "indeterminado",
    end_date: "2026-09-23",
    days_left: 0,
    counting: "BUSINESS",
    doubled: false,
    doubled_reason: "",
    status: "OPEN",
    holidays_applied: [],
    intimation_id: "018f8dd1-180e-49e3-8216-9ae409b8add5",
    confirmed: false,
    court_record_id: "cr-1",
    cnj_number: "4004059-89.2026.8.26.0506",
    court: "TJSP",
    start_date: "2026-09-16",
    days: 5,
    source: "eproc",
    rules_version: "v1",
    selo: "a_apurar",
    confirmacao_exigida: true,
    prazo_interno: "2026-09-23",
    ...over,
  };
}

function detFixture({
  prazo,
  estado = "manual",
  excecaoMotivo = "",
}: {
  prazo: PrazoDetalheView | null;
  estado?: string;
  excecaoMotivo?: string;
}) {
  return {
    model: {
      id: "018f8dd1-180e-49e3-8216-9ae409b8add5",
      fatalData: prazo?.end_date ? "23/09/2026" : "",
      prazoCor: "#0a5",
      prazoNum: prazo?.days ?? 0,
      prazoFrase: "dias úteis",
      responsavelId: null,
      responsavelNome: null,
    },
    prazoDetalhe: prazo,
    revisao: situacaoRevisao(prazo, estado),
    intimacao: { estado, excecao_motivo: excecaoMotivo },
    memoria: null,
    memoriaPending: false,
    memoriaErro: false,
    membros: [],
    assignEmVoo: false,
    onAssign: () => {},
    recarregarPrazo: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture: só os campos que PainelPrazo lê
  } as any as Parameters<typeof PainelPrazo>[0]["det"];
}

function renderPainel(
  det: ReturnType<typeof detFixture>,
  overrides: Partial<Omit<Parameters<typeof PainelPrazo>[0], "det">> = {},
): string {
  const qc = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <PainelPrazo det={det} compacto {...overrides} />
    </QueryClientProvider>,
  );
}

describe("PainelPrazo — exceção de classificação (caso 018f8dd1)", () => {
  it("0 action items, modo execução → causa concreta + CTA 'Definir tipo do ato' visíveis (ação obrigatória, não só aviso), explicação factual (sem afirmar piso/provisório sem dado tipado)", () => {
    const det = detFixture({ prazo: prazoFixture018f() });
    const html = renderPainel(det, { modo: "execucao" });
    expect(html).toContain("Tipo do ato não identificado");
    expect(html).toContain(
      "O sistema não identificou o tipo do ato. Revise a classificação e confira o prazo registrado.",
    );
    expect(html).toContain("Definir tipo do ato");
    // Ausência de action_items não é o motivo mostrado nem impede a ação —
    // não há menção de "conflito"/"divergência" (isso é o caso 0b81, distinto).
    expect(html).not.toContain("diverge do conteúdo identificado");
    // Sem o dado tipado real (`excecao_motivo==='provisorio'`), não se afirma
    // "piso legal CPC 218§3" — nem qualquer menção a "provisório" universal.
    expect(html).not.toContain("provisório");
    expect(html).not.toContain("CPC 218");
  });

  it("com o dado tipado real (`excecao_motivo==='provisorio'`) → usa o rótulo CANÔNICO já existente (EXCECAO_MOTIVO_LABEL da Triagem, não um texto novo)", () => {
    const det = detFixture({
      prazo: prazoFixture018f(),
      excecaoMotivo: "provisorio",
    });
    const html = renderPainel(det, { modo: "execucao" });
    expect(html).toContain(
      "Prazo provisório (piso supletivo) — confirme a contagem.",
    );
  });

  it("modo consulta (readOnly) → causa continua visível, SEM CTA (sem mutação em consulta)", () => {
    const det = detFixture({ prazo: prazoFixture018f() });
    const html = renderPainel(det, { modo: "consulta" });
    expect(html).toContain("Tipo do ato não identificado");
    expect(html).toContain("O sistema não identificou o tipo do ato.");
    expect(html).not.toContain("Definir tipo do ato");
  });

  // Regressão CRÍTICA: o caso 0b81 (divergência prazo×obrigação) também tem
  // tipo_ato='indeterminado' — mas origem='declarado'/selo='confiavel'. SEM
  // o gate `selo==='a_apurar'`, este bloco duplicaria "causa/CTA" ali TAMBÉM,
  // fora do fluxo D1 (já resolvido por DisposicaoSection/"Revisar
  // classificação"). Achado real do root, não hipotético.
  it("0b81 (declarado/confiavel/indeterminado) → ZERO causa/CTA de exceção de classificação aqui; fluxo continua só em DisposicaoSection", () => {
    const det = detFixture({
      prazo: prazoFixture018f({
        tipo_ato: "indeterminado",
        selo: "confiavel",
        confirmacao_exigida: false,
      }),
    });
    const html = renderPainel(det, { modo: "execucao" });
    expect(html).not.toContain("Tipo do ato não identificado");
    expect(html).not.toContain("O sistema não identificou o tipo do ato");
    expect(html).not.toContain("Definir tipo do ato");
  });

  it.each(["MISSED", "MET", "CANCELLED"] as const)(
    "status TERMINAL (%s) → SEM CTA mesmo em execução (whitelist OPEN/PENDING, BE 409ia fora dela)",
    (statusTerminal) => {
      const det = detFixture({
        prazo: prazoFixture018f({ status: statusTerminal }),
      });
      const html = renderPainel(det, { modo: "execucao" });
      expect(html).not.toContain("Definir tipo do ato");
    },
  );

  it("pós-Confirm (tipo válido, selo='confiavel', confirmed) → nem causa nem CTA, mesmo em execução", () => {
    const det = detFixture({
      prazo: prazoFixture018f({
        tipo_ato: "apelacao",
        selo: "confiavel",
        confirmacao_exigida: false,
        confirmed: true,
        confirmed_by_name: "Dra. Fulana",
        confirmed_at: "2026-09-23T10:00:00Z",
      }),
    });
    const html = renderPainel(det, { modo: "execucao" });
    expect(html).not.toContain("Tipo do ato não identificado");
    expect(html).not.toContain("Definir tipo do ato");
    expect(html).not.toContain("Prazo provisório (piso legal CPC 218§3)");
  });

  it("renderizar a exceção não dispara mutação: diálogo fechado por padrão, botão que muta (dentro do form) não está no HTML inicial", () => {
    const det = detFixture({ prazo: prazoFixture018f() });
    const html = renderPainel(det, { modo: "execucao" });
    // O trigger que ABRE o diálogo está presente (é só um <button>, sem
    // side-effect); os campos do form/CTA de submit do diálogo (fechado por
    // padrão) não aparecem no HTML inicial.
    expect(html).toContain("Definir tipo do ato");
    expect(html).not.toContain("Não há prazo");
  });
});
