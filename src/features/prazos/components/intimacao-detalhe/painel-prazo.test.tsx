import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { situacaoRevisao } from "../../lib/detalhe-apresentacao";
import type { DimensionReview, PrazoDetalheView } from "../../types";
import { ConfirmacaoPrazo } from "./confirmacao-prazo";
import { DefinirTipoAto } from "./definir-tipo-ato";
import { PainelPrazo } from "./intimacao-detalhe";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => null }),
}));

const pending: DimensionReview = {
  status: "pending",
  origin: "ia",
  reason_codes: ["ai_inferred"],
  reason: "Tipo sugerido automaticamente; confira a publicação.",
  confirmed_by_id: null,
  confirmed_by_name: null,
  confirmed_at: null,
  can_review: true,
};

function prazoFixture(over: Partial<PrazoDetalheView> = {}): PrazoDetalheView {
  return {
    id: "cea58159-0000-0000-0000-000000000000",
    tipo_ato: "impugnacao_cumprimento",
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
    review_revision: 3,
    review: {
      tipo: pending,
      prazo: {
        ...pending,
        origin: "generic_fallback",
        reason_codes: ["generic_fallback"],
        reason: "Base genérica provisória; confira o prazo.",
      },
    },
    current_calculation: null,
    calculation_audit_status: "unavailable",
    tipo_ato_origem: "ia",
    provisorio: true,
    no_deadline_reason: null,
    ...over,
  };
}

function renderPainel(
  prazo: PrazoDetalheView,
  modo: "execucao" | "consulta" = "execucao",
  compacto = true,
): string {
  const qc = new QueryClient();
  const det = {
    model: {
      id: prazo.intimation_id,
      fatalData: prazo.end_date ? "23/09/2026" : "",
      prazoCor: "#0a5",
      prazoNum: prazo.days,
      prazoFrase: "dias úteis",
      responsavelId: null,
      responsavelNome: null,
    },
    prazoDetalhe: prazo,
    prazoTipoLabel:
      prazo.tipo_ato === "impugnacao_cumprimento"
        ? "Impugnação ao cumprimento de sentença"
        : null,
    revisao: situacaoRevisao(prazo, "ia"),
    intimacao: { estado: "ia", excecao_motivo: "provisorio" },
    memoria: null,
    memoriaPending: false,
    memoriaErro: false,
    membros: [],
    assignEmVoo: false,
    onAssign: () => {},
    recarregarPrazo: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture only supplies fields read by PainelPrazo
  } as any as Parameters<typeof PainelPrazo>[0]["det"];
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <PainelPrazo det={det} modo={modo} compacto={compacto} />
    </QueryClientProvider>,
  );
}

describe("PainelPrazo — revisão por dimensão", () => {
  it("coloca Não há prazo no diálogo Prazo e deixa o Tipo focado na classificação", () => {
    const p = prazoFixture();
    const qc = new QueryClient();
    const tipo = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <DefinirTipoAto intimacaoId={p.intimation_id} prazo={p} />
      </QueryClientProvider>,
    );
    const prazo = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <ConfirmacaoPrazo id={p.intimation_id} prazo={p} estado="ia" />
      </QueryClientProvider>,
    );
    expect(tipo).not.toContain("Não há prazo");
    expect(prazo).toContain("Não há prazo");
    expect(prazo).toContain("corrige a classificação para ciência");
    expect(prazo).not.toContain("impugnacao_cumprimento");
  });
  it("mostra tipo inferido preenchido e fallback provisório com ações independentes, mesmo sem action items", () => {
    const html = renderPainel(prazoFixture());
    expect(html).toContain("Conferência da intimação");
    expect(html).toContain("Impugnação ao cumprimento de sentença");
    expect(html).toContain("<span>A revisar</span>");
    expect(html).toContain("Revisar tipo");
    expect(html).toContain("Revisar prazo");
    expect(html).toContain("Base genérica provisória");
    expect(html).not.toContain("generic_fallback");
  });
  it("NO_DEADLINE aguardando classificação permite apenas definir tipo", () => {
    const p = prazoFixture({
      status: "NO_DEADLINE",
      tipo_ato: "indeterminado",
      no_deadline_reason: "CLASSIFICAR_MANUAL",
      review: {
        tipo: { ...pending, reason_codes: ["ambiguous_type"] },
        prazo: { ...pending, can_review: false },
      },
    });
    const html = renderPainel(p);
    expect(html).toContain("Definir tipo");
    expect(html).toContain("Prazo a definir");
    expect(html).not.toContain("23/09/2026");
    expect(html).not.toContain("Revisar prazo");
  });
  it("NO_DEADLINE por ciência não mostra data histórica residual", () => {
    const html = renderPainel(
      prazoFixture({
        status: "NO_DEADLINE",
        no_deadline_reason: "CIENCIA",
        review: {
          tipo: { ...pending, status: "confirmed", can_review: false },
          prazo: { ...pending, status: "confirmed", can_review: false },
        },
      }),
    );
    expect(html).toContain("Sem prazo");
    expect(html).not.toContain("23/09/2026");
    expect(html).not.toContain("Definir tipo");
  });
  it("consulta informa as duas dimensões sem controles de mutação", () => {
    const html = renderPainel(prazoFixture(), "consulta");
    expect(html).toContain("<span>A revisar</span>");
    expect(html).not.toContain("Revisar tipo");
    expect(html).not.toContain("Revisar prazo");
  });
  it.each(["MISSED", "MET", "CANCELLED"] as const)(
    "estado terminal %s não abre revisão",
    (status) => {
      const html = renderPainel(prazoFixture({ status }));
      expect(html).not.toContain("Revisar tipo");
      expect(html).not.toContain("Revisar prazo");
    },
  );
  it("tipo confirmado não transforma prazo pendente em confirmado", () => {
    const html = renderPainel(
      prazoFixture({
        review: {
          tipo: {
            ...pending,
            status: "confirmed",
            reason: "Confirmado por Ana",
            confirmed_by_name: "Ana",
            confirmed_at: "2026-09-23T10:00:00Z",
          },
          prazo: pending,
        },
      }),
    );
    expect(html).toContain("<span>Confirmado</span>");
    expect(html).toContain("<span>A revisar</span>");
    expect(html).toContain("Revisar prazo");
  });
  it("divergência pendente encaminha à apuração, sem confirmação normal", () => {
    const p = prazoFixture({
      review: {
        tipo: pending,
        prazo: { ...pending, reason_codes: ["date_divergence"] },
      },
    });
    const html = renderPainel(p);
    expect(html).toContain("Use a apuração");
    expect(html).toContain("Revisar prazo</button>");
    const qc = new QueryClient();
    const modal = renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <ConfirmacaoPrazo id={p.intimation_id} prazo={p} estado="divergente" />
      </QueryClientProvider>,
    );
    expect(modal).toContain("Não há prazo");
    expect(modal).not.toContain("Confirmar prazo");
  });
  it("revisão dispensada usa indicador neutro, sem check de confirmação", () => {
    const html = renderPainel(
      prazoFixture({
        review: {
          tipo: { ...pending, status: "not_required" },
          prazo: { ...pending, status: "not_required" },
        },
      }),
    );
    expect(html).toContain("Revisão dispensada");
    expect(html).toContain("lucide-minus");
    expect(html).not.toContain("lucide-check");
  });
});
