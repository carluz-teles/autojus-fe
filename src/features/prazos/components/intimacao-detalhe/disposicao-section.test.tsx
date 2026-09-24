import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { IntimacaoProvidencia } from "@/features/intimacoes/types";

import type { PrazoDetalheView } from "../../types";
import { DisposicaoSection } from "./disposicao-section";

// useDisposicao → useResolverIntimacao → useApi → useAuth (Clerk). Renderizar
// a seção sem <ClerkProvider> (SSR puro, sem sessão) exige esse mock — só
// vale para este arquivo, sem harness/arquivo novo compartilhado.
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => null }),
}));

function prov(over: Partial<IntimacaoProvidencia>): IntimacaoProvidencia {
  return {
    id: "ai-1",
    title: "Providência",
    description: null,
    tipo: "manifestar",
    gera_peca: false,
    piece_profile_key: null,
    tipo_origem: "ia",
    tipo_status: "confiavel",
    confianca: null,
    status: "SUGGESTED",
    deadline_id: null,
    ...over,
  };
}

// Fixture do prazo — caso real 0b81f219 (motor recontou 3 dias de um evento
// eproc FECHADO): OPEN, declarado/confiavel, tipo_ato indeterminado.
function prazoFixture(over: Partial<PrazoDetalheView> = {}): PrazoDetalheView {
  return {
    id: "56a370f1-d03b-4bb7-a888-e92f2475f4ca",
    tipo_ato: "indeterminado",
    end_date: "2026-09-23",
    days_left: 0,
    counting: "BUSINESS",
    doubled: false,
    doubled_reason: "",
    status: "OPEN",
    holidays_applied: [],
    intimation_id: "0b81f219-180e-49e3-8216-9ae409b8add5",
    confirmed: false,
    court_record_id: "cr-1",
    cnj_number: "0000000-00.2026.8.26.0000",
    court: "TJSP",
    start_date: "2026-09-18",
    days: 3,
    source: "eproc",
    rules_version: "v1",
    origem: "declarado",
    selo: "confiavel",
    confirmacao_exigida: false,
    prazo_interno: "2026-09-21",
    ...over,
  };
}

// useDisposicao usa useMutation/useQueryClient (Dar ciência) — precisa de um
// QueryClientProvider real no teste; renderToStaticMarkup basta (SSR puro,
// mesmo padrão de explicacao-prazo.test.tsx), sem harness novo.
function renderSection(
  providencias: IntimacaoProvidencia[],
  overrides: Partial<React.ComponentProps<typeof DisposicaoSection>> = {},
): string {
  const qc = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <DisposicaoSection
        intimationId="int-1"
        providencias={providencias}
        analyzed={true}
        analyzing={false}
        onAnalyze={() => {}}
        ato="Sentença"
        tipoLabel="Sentença"
        assunto="Assunto"
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

describe("DisposicaoSection", () => {
  it("vazia, mesmo com analyzed=true → CTA Analisar (nunca 'mera ciência' por omissão)", () => {
    const html = renderSection([], { analyzed: true });
    expect(html).toContain("Analisar intimação");
    expect(html).not.toContain("Mera ciência");
  });

  it("caso real (cumprir, gera_peca=false) → mostra title/description do action_item, sem texto de ciência", () => {
    const html = renderSection([
      prov({
        id: "01a0cf20-c9fd-7ccc-b84f-8da470df4462",
        tipo: "cumprir",
        gera_peca: false,
        title: "Indicar endereço da parte executada (art. 259, CPC)",
        description:
          "Apresentar o endereço correto da parte executada nos autos.",
      }),
    ]);
    expect(html).toContain("Indicar endereço da parte executada");
    expect(html).toContain("Apresentar o endereço correto");
    expect(html).not.toContain("Mera ciência");
    expect(html).not.toContain("Providência");
  });

  it("ciência real com title/description → mostra o CONTEÚDO IDENTIFICADO real, não texto genérico", () => {
    const html = renderSection([
      prov({
        id: "c1",
        tipo: "ciencia",
        gera_peca: false,
        title: "Tomar ciência da juntada de mandado cumprido",
        description:
          "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos.",
      }),
    ]);
    expect(html).toContain("Tomar ciência da juntada de mandado cumprido");
    expect(html).toContain(
      "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos.",
    );
    expect(html).not.toContain(
      "Mera ciência — nenhuma obrigação adicional identificada.",
    );
    expect(html).not.toContain("basta dar ciência");
  });

  it("ciência real sem title (item degradado) → rótulo neutro 'Tomar ciência', nunca genérico 'Mera ciência'", () => {
    const html = renderSection([
      prov({ id: "c1", tipo: "ciencia", gera_peca: false, title: null }),
    ]);
    expect(html).toContain("Tomar ciência");
    expect(html).not.toContain(
      "Mera ciência — nenhuma obrigação adicional identificada.",
    );
  });

  it("lote misto (obrigação válida + tipo desconhecido) → renderiza os DOIS itens, não só o conhecido", () => {
    const html = renderSection([
      prov({
        id: "valido1",
        tipo: "cumprir",
        gera_peca: false,
        title: "Cumprir determinação X",
      }),
      prov({
        id: "unknown1",
        // @ts-expect-error — runtime pode divergir do enum fechado do FE.
        tipo: "xpto",
        gera_peca: false,
        title: "Ato bruto não identificado",
      }),
    ]);
    expect(html).toContain("Cumprir determinação X");
    expect(html).toContain("Ato bruto não identificado");
  });

  it("sem disposicaoBE/agreementState (dado ausente) → nenhum aviso de conflito inventado", () => {
    const html = renderSection([
      prov({ id: "p1", tipo: "cumprir", gera_peca: true }),
    ]);
    expect(html).not.toContain(
      "A classificação do prazo diverge do conteúdo identificado",
    );
  });

  it("agreementState='divergente' → aviso de conflito, item local preservado, nunca texto de ciência", () => {
    const html = renderSection(
      [
        prov({
          id: "p1",
          tipo: "cumprir",
          gera_peca: true,
          title: "Contestar decisão",
        }),
      ],
      { agreementState: "divergente" },
    );
    expect(html).toContain(
      "A classificação do prazo diverge do conteúdo identificado",
    );
    expect(html).toContain("Contestar decisão");
    expect(html).not.toContain("Mera ciência");
  });

  it("disposicaoBE='ciencia' conflitando com trabalho local (fallback, sem agreementState) → aviso, sem 'mera ciência'", () => {
    const html = renderSection(
      [
        prov({
          id: "p1",
          tipo: "cumprir",
          gera_peca: false,
          title: "Cumprir X",
        }),
      ],
      { disposicaoBE: "ciencia" },
    );
    expect(html).toContain(
      "A classificação do prazo diverge do conteúdo identificado",
    );
    expect(html).toContain("Cumprir X");
  });

  it("disposicaoBE='excecao' → NÃO vira conflito (exceção do motor de prazo não é, por si, divergência)", () => {
    const html = renderSection(
      [prov({ id: "p1", tipo: "cumprir", gera_peca: false })],
      { disposicaoBE: "excecao" },
    );
    expect(html).not.toContain(
      "A classificação do prazo diverge do conteúdo identificado",
    );
  });

  // Resolução da divergência (caso real 0b81f219: motor recontou 3 dias de um
  // evento eproc FECHADO — ato + só ciência). ACs do PM: os dois lados
  // aparecem rotulados com fatos; "Revisar classificação" existe mesmo com
  // selo confiável; some em consulta; nunca dispara mutação ao só renderizar.
  describe("resolução da divergência (caso 0b81f219)", () => {
    const cienciaReal = prov({
      id: "01a0cbf9-b034-7c41-a1c0-34b0ede0629b",
      tipo: "ciencia",
      gera_peca: false,
      title: "Tomar ciência da juntada de mandado cumprido",
      description:
        "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos, podendo se manifestar sobre o ato.",
    });

    it("contraste de dois lados: fatos do motor (acionabilidade/tipo/origem/vencimento/selo) + conteúdo identificado, sem veredito jurídico", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        disposicaoBE: "excecao",
        acionabilidade: "ato",
        prazo: prazoFixture(),
        origemLabel: "Prazo declarado no ato",
      });
      // Lado A — motor.
      expect(html).toContain("Classificação do prazo (motor)");
      expect(html).toContain("Prazo declarado no ato");
      expect(html).toContain("23/09/2026");
      expect(html).toContain("confiável");
      // Lado B — conteúdo identificado (nunca suprimido).
      expect(html).toContain("Tomar ciência da juntada de mandado cumprido");
      expect(html).toContain(
        "A parte executada deve tomar ciência da juntada de mandado cumprido nos autos",
      );
      // Instrução curta, sem veredito automático (nem "está correto", nem
      // afirmação de fato jurídico como "prazo já encerrado").
      expect(html).toContain("Compare com o teor e revise a classificação.");
      expect(html).not.toContain("está correto");
      expect(html).not.toContain("prazo já encerrado");
      expect(html).not.toContain("não indicam qual lado");
    });

    it("acionabilidade='ato' × tipo_ato='indeterminado' são DOIS eixos distintos, ambos rotulados (um não substitui o outro)", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture({ tipo_ato: "indeterminado" }),
      });
      // O DADO que explica a divergência (acionabilidade) — vocabulário canônico.
      expect(html).toContain("Exige cumprimento");
      // O outro eixo (tipo_ato) continua visível, mas rotulado à parte — não
      // aparece como se fosse a mesma coisa nem substitui "Exige cumprimento".
      expect(html).toContain("Tipo do ato:");
      expect(html).toContain("A classificar");
      // O item identificado é ciência — o contraste é "Exige cumprimento"
      // (motor) × ciência (conteúdo), não "A classificar" × ciência.
      expect(html).not.toContain("A classificar × ");
    });

    it("CTA 'Revisar classificação' aparece mesmo com selo='confiavel' (selo NÃO gateia a ação)", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture({ selo: "confiavel" }),
      });
      expect(html).toContain("Revisar classificação");
    });

    it("status PENDING (não só OPEN) → whitelist canônica também aceita", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture({ status: "PENDING" }),
      });
      expect(html).toContain("Revisar classificação");
    });

    it.each(["MISSED", "MET", "CANCELLED"] as const)(
      "status TERMINAL (%s) → NÃO oferece a correção (BE 409ia fora do guard PENDING/OPEN/NO_DEADLINE); nota de gap presente mesmo assim",
      (statusTerminal) => {
        const html = renderSection([cienciaReal], {
          agreementState: "divergente",
          acionabilidade: "ato",
          prazo: prazoFixture({ status: statusTerminal }),
        });
        expect(html).not.toContain("Revisar classificação");
        expect(html).toContain("ainda não tem uma correção guiada");
      },
    );

    it("lote MISTO (ciência + obrigação real) → NÃO oferece a correção (definir tipo pode ser parte da resposta certa; não é só 'marcar sem prazo')", () => {
      const html = renderSection(
        [
          cienciaReal,
          prov({ id: "obrig1", tipo: "cumprir", gera_peca: false }),
        ],
        {
          agreementState: "divergente",
          acionabilidade: "ato",
          prazo: prazoFixture(),
        },
      );
      expect(html).not.toContain("Revisar classificação");
      expect(html).toContain("ainda não tem uma correção guiada");
    });

    it("modo consulta (readOnly) COM padrão corrigível: dois lados visíveis, SEM a ação — e SEM a nota de gap (o gap é de permissão, não de padrão, não confundir os dois)", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture(),
        readOnly: true,
      });
      expect(html).toContain("Tomar ciência da juntada de mandado cumprido");
      expect(html).toContain("Classificação do prazo (motor)");
      expect(html).not.toContain("Revisar classificação");
      expect(html).not.toContain("ainda não tem uma correção guiada");
    });

    it("modo consulta (readOnly) SEM padrão corrigível (lote misto): a nota de gap aparece mesmo em consulta (é sobre o PADRÃO, não sobre permissão)", () => {
      const html = renderSection(
        [
          cienciaReal,
          prov({ id: "obrig1", tipo: "cumprir", gera_peca: false }),
        ],
        {
          agreementState: "divergente",
          acionabilidade: "ato",
          prazo: prazoFixture(),
          readOnly: true,
        },
      );
      expect(html).not.toContain("Revisar classificação");
      expect(html).toContain("ainda não tem uma correção guiada");
    });

    it("sem item de ciência identificado → NÃO oferece a correção (definir tipo não resolveria o agreement) e não finge resolvido", () => {
      const html = renderSection(
        [prov({ id: "p1", tipo: "cumprir", gera_peca: true })],
        {
          agreementState: "divergente",
          acionabilidade: "ato",
          prazo: prazoFixture(),
        },
      );
      expect(html).not.toContain("Revisar classificação");
      expect(html).toContain("ainda não tem uma correção guiada");
    });

    it("prazo NO_DEADLINE (padrão inverso) → NÃO oferece a correção (cadeia reopen+adjust fora de escopo); BE aceitaria idempotente, mas FE não precisa do botão", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture({ status: "NO_DEADLINE" }),
      });
      expect(html).not.toContain("Revisar classificação");
    });

    it("acionabilidade !=='ato' (ex.: já 'ciencia') → NÃO oferece a correção mesmo com agreementState divergente e item de ciência presente", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ciencia",
        prazo: prazoFixture(),
      });
      expect(html).not.toContain("Revisar classificação");
    });

    it("renderizar a divergência não dispara mutação: diálogo fechado por padrão, botão de correção não está no DOM inicial", () => {
      const html = renderSection([cienciaReal], {
        agreementState: "divergente",
        acionabilidade: "ato",
        prazo: prazoFixture(),
      });
      // O CTA que ABRE o diálogo está presente (é só um <button>, sem side
      // effect); o botão que de fato muta (dentro do diálogo, fechado por
      // padrão — Dialog.Root open={false}) não é renderizado no HTML inicial.
      expect(html).toContain("Revisar classificação");
      expect(html).not.toContain("Corrigir classificação para ciência");
    });
  });

  // Heading renderizado (disposicao.headline consumido no <p className="section-label">),
  // não só o valor computado em disposicao.test.ts — os 3 estados têm de bater na tela.
  describe("headline renderizado (disposicao.headline, não hard-coded)", () => {
    it("trabalho (tipo válido) → heading 'Trabalho a cumprir'", () => {
      const html = renderSection([
        prov({ id: "p1", tipo: "cumprir", gera_peca: false }),
      ]);
      expect(html).toContain("Trabalho a cumprir");
      expect(html).not.toContain("Trabalho necessário");
    });

    it("indeterminado (tipo desconhecido) → heading 'Trabalho a identificar'", () => {
      const html = renderSection([
        prov({
          id: "x1",
          // @ts-expect-error — runtime pode divergir do enum fechado do FE.
          tipo: "xpto",
          gera_peca: false,
        }),
      ]);
      expect(html).toContain("Trabalho a identificar");
    });

    it("ciência real pura → heading 'Ciência'", () => {
      const html = renderSection([
        prov({ id: "c1", tipo: "ciencia", gera_peca: false }),
      ]);
      expect(html).toContain("Ciência");
    });
  });

  // Oportunidade (docs/obrigacao-first-architecture.md v3 — PM: "Recurso/apelação
  // = Oportunidade", nunca "dever de recorrer"; ambíguo/ciência nunca a engolem).
  describe("oportunidade (tipo=recorrer) — classe distinta, nunca dever", () => {
    it("recorrer puro (com title do BE) → caixa própria 'Oportunidade', SEM caixa 'Trabalho a cumprir' vazia por cima", () => {
      const html = renderSection([
        prov({
          id: "rec1",
          tipo: "recorrer",
          gera_peca: true,
          title: "Avaliar cabimento de apelação",
        }),
      ]);
      expect(html).toContain("Oportunidade");
      expect(html).toContain("Avaliar cabimento de apelação");
      expect(html).toContain("Direito de agir");
      expect(html).toContain("opcional");
      expect(html).not.toContain("Trabalho a cumprir");
      // O headline computado seria "Oportunidade identificada" (ver
      // disposicao.test.ts), mas a caixa genérica fica OCULTA neste caso (o
      // conteúdo já está na caixa "Oportunidade") — nunca um eyebrow vazio.
      expect(html).not.toContain("Oportunidade identificada");
    });

    it("recorrer sem title (dado legado/degradado) → fallback FACTUAL, nunca 'Recorrer' (lê como dever)", () => {
      const html = renderSection([
        prov({ id: "rec2", tipo: "recorrer", gera_peca: true, title: null }),
      ]);
      expect(html).toContain("Avaliar cabimento de recurso");
      expect(html).not.toContain("Recorrer");
    });

    it("oportunidade NUNCA vira ciência nem indeterminado (classe própria, sempre 'trabalho')", () => {
      const html = renderSection([
        prov({ id: "rec1", tipo: "recorrer", gera_peca: true }),
      ]);
      expect(html).not.toContain("Ciência registrada");
      expect(html).not.toContain("Trabalho a identificar");
    });

    it("MISTO: obrigação real + oportunidade + indeterminado → as TRÊS classes visíveis, nenhuma esconde a outra", () => {
      const html = renderSection([
        prov({
          id: "obrig1",
          tipo: "cumprir",
          gera_peca: false,
          title: "Cumprir determinação X",
        }),
        prov({
          id: "rec1",
          tipo: "recorrer",
          gera_peca: true,
          title: "Avaliar cabimento de apelação",
        }),
        prov({
          id: "unk1",
          // @ts-expect-error — runtime pode divergir do enum fechado do FE.
          tipo: "xpto",
          gera_peca: false,
          title: "Ato bruto não identificado",
        }),
      ]);
      expect(html).toContain("Cumprir determinação X");
      expect(html).toContain("Ato bruto não identificado");
      expect(html).toContain("Avaliar cabimento de apelação");
      expect(html).toContain("Oportunidade");
      expect(html).toContain("Trabalho a cumprir");
    });

    it("oportunidade + indeterminado (SEM obrigação real) → headline 'Trabalho a identificar', unknown visível, Oportunidade em caixa própria", () => {
      const html = renderSection([
        prov({
          id: "rec1",
          tipo: "recorrer",
          gera_peca: true,
          title: "Avaliar cabimento de apelação",
        }),
        prov({
          id: "unk1",
          // @ts-expect-error — runtime pode divergir do enum fechado do FE.
          tipo: "xpto",
          gera_peca: false,
          title: "Ato bruto não identificado",
        }),
      ]);
      expect(html).toContain("Trabalho a identificar");
      expect(html).toContain("Ato bruto não identificado");
      expect(html).toContain("Oportunidade");
      expect(html).toContain("Avaliar cabimento de apelação");
      expect(html).not.toContain("Trabalho a cumprir");
    });
  });

  // GAP 2 (docs/obrigacao-first-architecture.md v3): obligation_quote é
  // evidência da OBRIGAÇÃO — mostra SEMPRE que existir, independente do gate
  // `possible_fulfillment` (autos). Nunca afirma "autos analisados" pro quote
  // determinístico neutro.
  describe("evidência da obrigação (fulfillment.obligation_quote) — independente do alerta de autos", () => {
    const sources = {
      source_revision: "rev-1",
      scope: "post_intimation_and_undated" as const,
      coverage: "usable" as const,
      reason: "",
      checked_at: "2026-09-23T00:00:00Z",
      stale: false,
    };

    it("status NEUTRO (no_indication, sem evidência de autos) → quote aparece mesmo assim, sem o alerta de cumprimento", () => {
      const html = renderSection([
        prov({
          id: "cump1",
          tipo: "cumprir",
          gera_peca: false,
          title: "Indicar endereço da parte executada",
          fulfillment: {
            status: "no_indication",
            reason: "",
            obligation_quote: "Indique o endereço atualizado em 5 dias.",
            evidence: [],
            sources,
            invalidated: false,
          },
        }),
      ]);
      expect(html).toContain("Trecho identificado no teor");
      expect(html).toContain("Indique o endereço atualizado em 5 dias.");
      expect(html).not.toContain("Possível cumprimento nos autos");
    });

    it("status possible_fulfillment (autos com evidência) → quote E alerta de autos aparecem, sem duplicar a citação", () => {
      const html = renderSection([
        prov({
          id: "cump2",
          tipo: "cumprir",
          gera_peca: false,
          fulfillment: {
            status: "possible_fulfillment",
            reason: "Resposta localizada pode atender a obrigação.",
            obligation_quote: "Comprovar o pagamento no prazo de 15 dias.",
            evidence: [
              {
                document_id: "doc-1",
                title: "Petição de pagamento",
                date: "2026-09-08",
                page: 4,
                quote: "O pagamento foi comprovado nos autos.",
              },
            ],
            sources,
            invalidated: false,
          },
        }),
      ]);
      expect(html).toContain("Trecho identificado no teor");
      expect(html).toContain("Comprovar o pagamento no prazo de 15 dias.");
      expect(html).toContain("Possível cumprimento nos autos");
      // A citação da obrigação aparece exatamente 1 vez (não duplicada pelo
      // componente de alerta, que teve o próprio bloco de quote retirado).
      expect(
        html.split("Comprovar o pagamento no prazo de 15 dias.").length - 1,
      ).toBe(1);
    });

    it("legado sem fulfillment (dado antigo) → sem quote, sem alerta, sem crash", () => {
      const html = renderSection([
        prov({
          id: "cump3",
          tipo: "cumprir",
          gera_peca: false,
          title: "Cumprir determinação antiga",
        }),
      ]);
      expect(html).toContain("Cumprir determinação antiga");
      expect(html).not.toContain("Trecho identificado no teor");
      expect(html).not.toContain("Possível cumprimento nos autos");
    });

    // Selo de desatualização: `invalidated`/`sources.stale` não escondem o
    // quote (é informação real), mas trocam o rótulo — nunca apresentar como
    // vigente sem esse sinal (o teor/autos podem ter mudado desde a captura).
    it.each([
      ["invalidated", { invalidated: true, sources }],
      [
        "sources.stale",
        { invalidated: false, sources: { ...sources, stale: true } },
      ],
    ] as const)(
      "%s → quote aparece com rótulo 'análise desatualizada', não 'no teor'",
      (_label, overrides) => {
        const html = renderSection([
          prov({
            id: "cump4",
            tipo: "cumprir",
            gera_peca: false,
            fulfillment: {
              status: "no_indication",
              reason: "",
              obligation_quote: "Recolher as custas em 5 dias.",
              evidence: [],
              ...overrides,
            },
          }),
        ]);
        expect(html).toContain("Recolher as custas em 5 dias.");
        expect(html).toContain("análise desatualizada");
        expect(html).not.toContain("Trecho identificado no teor");
      },
    );
  });
});
