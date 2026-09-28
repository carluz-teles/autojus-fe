import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { PipelineRow } from "../../lib/pipeline";
import { RowReadonly, RowTriar } from "./row-triar";

// Fixture mínima de PipelineRow — os componentes de apresentação (RowTriar/
// RowReadonly) só consomem este contrato, nunca IntimacaoView cru.
function row(overrides: Partial<PipelineRow> = {}): PipelineRow {
  return {
    id: "i-1",
    lifecycle: "a_triar",
    courtRecordId: "cr-1",
    categoriaLabel: "Intimação",
    categoria: "intimacao",
    demandLabel: "",
    summary: "",
    title: "Fulano de Tal · 0000000-00.2026.8.26.0001",
    meta: "0000000-00.2026.8.26.0001 · TJSP · 1º grau",
    ato: "Manifestação",
    atoPublicacao: "Despacho de mero expediente",
    geraPeca: false,
    prazo: {
      tone: "futuro",
      fatalISO: "2026-10-01",
      fatalCurto: "01/10",
      fatalLongo: "01/10/2026",
      relativo: "3d",
      internoCurto: "",
      provisorio: false,
    },
    segment: "trabalhar",
    isExcecao: false,
    excecaoMotivo: "",
    responsavelId: null,
    responsavelNome: null,
    estado: {
      label: "Em triagem",
      tone: "pending",
      cor: "var(--fg2)",
      fundo: "var(--muted)",
      encerrada: false,
    },
    rec: null,
    resolvedAt: null,
    preview: "",
    ...overrides,
  };
}

// QA (ISSUE-3, review de P0-2): RowReadonly ("Em andamento"/"Concluído") herda
// o chip novo de demand_kind via o mapper compartilhado (pipeline.ts), mas até
// aqui mantinha o subtítulo fixo em atoPublicacao — o MESMO item mostrava o
// resumo legível numa aba e o ato cru na outra. Ambas as linhas agora aplicam
// o mesmo fallback `summary || atoPublicacao`; este teste prova a paridade.
describe("subtítulo da linha (summary || atoPublicacao) — paridade entre abas", () => {
  it("RowTriar: mostra o summary do brief quando presente", () => {
    const html = renderToStaticMarkup(
      <RowTriar
        row={row({ summary: "Sentença de procedência — réu condenado." })}
        selected={false}
        density="confortavel"
        members={[]}
        href="/intimacoes/i-1"
        onToggleSelect={vi.fn()}
        onAction={vi.fn()}
        onAssign={vi.fn()}
      />,
    );
    expect(html).toContain("Sentença de procedência — réu condenado.");
    expect(html).not.toContain("Despacho de mero expediente");
  });

  it('RowTriar: sem brief ainda (summary=""), cai no atoPublicacao (fallback)', () => {
    const html = renderToStaticMarkup(
      <RowTriar
        row={row({ summary: "" })}
        selected={false}
        density="confortavel"
        members={[]}
        href="/intimacoes/i-1"
        onToggleSelect={vi.fn()}
        onAction={vi.fn()}
        onAssign={vi.fn()}
      />,
    );
    expect(html).toContain("Despacho de mero expediente");
  });

  it("RowReadonly: mostra o MESMO summary do brief que a RowTriar mostraria (paridade entre abas)", () => {
    const html = renderToStaticMarkup(
      <RowReadonly
        row={row({ summary: "Sentença de procedência — réu condenado." })}
        density="confortavel"
        href="/intimacoes/i-1"
      />,
    );
    expect(html).toContain("Sentença de procedência — réu condenado.");
    expect(html).not.toContain("Despacho de mero expediente");
  });

  it('RowReadonly: sem brief ainda (summary=""), cai no atoPublicacao (fallback, comportamento anterior)', () => {
    const html = renderToStaticMarkup(
      <RowReadonly
        row={row({ summary: "" })}
        density="confortavel"
        href="/intimacoes/i-1"
      />,
    );
    expect(html).toContain("Despacho de mero expediente");
  });

  // Reviewer (pré-merge): `shrink-0` no span do subtítulo da RowReadonly
  // impedia `truncate` de agir (o span nunca encolhe abaixo da largura
  // intrínseca, então overflow-hidden não tem o que clipar) — inofensivo
  // quando o conteúdo era o `atoPublicacao` curto ("Despacho"), mas estoura a
  // linha com prosa longa do brief_summary. `min-w-0` (o mesmo da RowTriar,
  // linha 195) corrige. Prova da classe, não do layout renderizado de fato
  // (isso é o passe visual).
  it("RowReadonly: o span do subtítulo usa min-w-0 (não shrink-0), igual à RowTriar — permite truncar prosa longa", () => {
    const html = renderToStaticMarkup(
      <RowReadonly
        row={row({
          summary:
            "Sentença de procedência parcial — réu condenado ao pagamento de honorários advocatícios e custas processuais, com trânsito em julgado pendente de manifestação das partes.",
        })}
        density="confortavel"
        href="/intimacoes/i-1"
      />,
    );
    const match = html.match(/<span class="([^"]*)">Sentença de procedência/);
    expect(match).not.toBeNull();
    const classes = match![1];
    expect(classes).toContain("min-w-0");
    expect(classes).not.toContain("shrink-0");
  });
});
