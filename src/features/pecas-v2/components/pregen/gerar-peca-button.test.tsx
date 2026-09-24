import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  GerarPecaButton,
  type PecaTarget,
  urlDaPeca,
} from "./gerar-peca-button";

// usePecaGeracao → useRouter (next/navigation) exige o App Router mountado;
// SSR puro (renderToStaticMarkup) não tem esse contexto. Mock escopado a
// este arquivo, mesmo padrão já usado no repo para Clerk — sem harness novo.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

// Fonte única do fluxo canônico "Gerar peça": todo entry point (detalhe,
// triagem, Mesa/preview) chama `usePecaGeracao`/`GerarPecaButton`, que navega
// via `urlDaPeca`. A garantia central do contrato (PM `gerar-peca-flow-pm.md`
// AC1/AC2): `auto=1` SEMPRE presente → a tela de construção pula direto para
// o loader de 4 fases (autos/teses/contexto), nunca um wizard de seleção
// manual de teses.
function targetFixture(over: Partial<PecaTarget> = {}): PecaTarget {
  return {
    intimacaoId: "int-1",
    processoId: "proc-1",
    actionItemId: "ai-1",
    retorno: "/intimacoes/int-1",
    ...over,
  };
}

describe("urlDaPeca — contrato canônico (auto=1 sempre, sem wizard)", () => {
  it("inclui auto=1 sempre, independente de jaIniciada/degree/pecaLabel", () => {
    const semJaIniciada = urlDaPeca(targetFixture());
    const comJaIniciada = urlDaPeca(targetFixture({ jaIniciada: true }));
    expect(semJaIniciada).toContain("auto=1");
    expect(comJaIniciada).toContain("auto=1");
  });

  it("aponta pra /pecas/nova com providencia/intimacao/retorno corretos e retorno url-encoded", () => {
    const url = urlDaPeca(
      targetFixture({
        actionItemId: "ai-42",
        intimacaoId: "int-42",
        retorno: "/intimacoes/int-42?tab=exec",
      }),
    );
    expect(url).toBe(
      "/pecas/nova?providencia=ai-42&intimacao=int-42&auto=1&retorno=%2Fintimacoes%2Fint-42%3Ftab%3Dexec",
    );
  });

  it("usa a origem por intimação para uma peça opcional de obrigação sem gera_peca", () => {
    expect(urlDaPeca(targetFixture({ actionItemId: undefined }))).toBe(
      "/pecas/nova?intimacao=int-1&auto=1&retorno=%2Fintimacoes%2Fint-1",
    );
  });

  it("consulta um draft antigo do item sem enviar providencia para criação", () => {
    const url = urlDaPeca(
      targetFixture({
        actionItemId: undefined,
        existingActionItemId: "item-1",
      }),
    );
    expect(url).toContain("verificar_providencia=item-1");
    expect(url).not.toContain("?providencia=");
  });

  it("nunca aponta para uma rota de wizard/seleção de teses", () => {
    const url = urlDaPeca(targetFixture());
    expect(url).not.toMatch(/teses|wizard|selecao|selecionar/i);
  });
});

describe("GerarPecaButton — markup (sem clique; iniciar()/router testados via urlDaPeca)", () => {
  it("rótulo padrão 'Gerar peça' quando não iniciada; 'Abrir peça' quando jaIniciada", () => {
    const semIniciar = renderToStaticMarkup(
      <GerarPecaButton {...targetFixture()} />,
    );
    const jaIniciada = renderToStaticMarkup(
      <GerarPecaButton {...targetFixture({ jaIniciada: true })} />,
    );
    expect(semIniciar).toContain("Gerar peça");
    expect(jaIniciada).toContain("Abrir peça");
  });

  it("rótulo customizado sobrepõe o default", () => {
    const html = renderToStaticMarkup(
      <GerarPecaButton {...targetFixture()} label="Continuar peça" />,
    );
    expect(html).toContain("Continuar peça");
    expect(html).not.toContain(">Gerar peça<");
  });

  it("habilitado sem actionItemId quando há intimação de origem", () => {
    const html = renderToStaticMarkup(
      <GerarPecaButton {...targetFixture({ actionItemId: undefined })} />,
    );
    expect(html).not.toContain(' disabled=""');
  });

  it("desabilitado sem intimação de origem", () => {
    const html = renderToStaticMarkup(
      <GerarPecaButton {...targetFixture({ intimacaoId: "" })} />,
    );
    expect(html).toContain("disabled");
  });

  it("renderizar o botão (estado fechado) não monta o gate/modal de orientação — sem side-effect", () => {
    // `modais` só existe depois de `iniciar()` (target setado); no render
    // inicial (sem clique/interação) nenhum modal/gate está no HTML.
    const html = renderToStaticMarkup(<GerarPecaButton {...targetFixture()} />);
    expect(html).not.toContain("Antes de gerar a peça");
    expect(html).not.toContain('role="dialog"');
  });
});
