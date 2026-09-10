import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { FlowDraft } from "../lib/providencia-flow";
import type { ActionItemView } from "../types";
import {
  ProvidenciaNextStep,
  ProvidenciaPiece,
  ProvidenciaSteps,
} from "./providencia-flow";

const item: ActionItemView = {
  id: "work-1",
  intimation_id: "source-1",
  title: "Manifestação",
  tipo: "manifestar",
  gera_peca: true,
  tipo_origem: "manual",
  tipo_status: "confiavel",
  status: "WORKING",
  due_date: null,
  completed_at: null,
  created_at: "2026-09-09T10:00:00Z",
  updated_at: "2026-09-09T10:00:00Z",
  draft_id: "draft-1",
  draft_state: "DRAFTED",
};

describe("apresentação da providência integrada", () => {
  it("distingue revisão atual de uma etapa já concluída", () => {
    const html = renderToStaticMarkup(
      <ProvidenciaSteps item={item} evidence={{}} />,
    );
    const current = html.match(
      /<button[^>]*aria-current="step"[\s\S]*?<\/button>/,
    )?.[0];
    expect(current).toContain("Revisão");
    expect(current).toContain("lucide-file-search");
    expect(current).not.toContain("lucide-check");
  });
  it.each([
    ["creator-1", "Luan", "Luan"],
    ["creator-1", undefined, "Membro com identificação indisponível"],
    ["", "Responsável diferente", "Autoria não registrada"],
    [undefined, "Responsável diferente", "Autoria indisponível"],
  ])(
    "mostra autoria registrada %s sem inferir pelo responsável",
    (created_by, creatorName, expected) => {
      const draft = {
        id: item.draft_id,
        created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
      } as FlowDraft;
      const html = renderToStaticMarkup(
        <ProvidenciaPiece
          item={item}
          evidence={{ draft }}
          creatorName={creatorName}
        />,
      );
      expect(html).toContain("Criada por");
      expect(html).toContain(expected!);
      expect(html).not.toContain("Responsável diferente");
    },
  );
  it("tem apenas uma etapa atual, consulta acessível e não duplica o h1 do header", () => {
    const html = renderToStaticMarkup(
      createElement(ProvidenciaSteps, { item, evidence: {} }),
    );
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Etapas da providência"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("<h1");
    expect(html).not.toContain('href="/dev/');
  });
  it("leva à peça real e preserva o retorno à providência", () => {
    const html = renderToStaticMarkup(
      createElement(ProvidenciaPiece, { item, evidence: {} }),
    );
    expect(html).toContain("/pecas/draft-1?retorno=%2Fprovidencias%2Fwork-1");
    expect(html).toContain("Minuta disponível");
    expect(html).not.toContain("<h1");
  });
  it("mostra falha parcial sem esconder a ação existente", () => {
    const html = renderToStaticMarkup(
      <ProvidenciaNextStep
        item={item}
        evidence={{ unavailable: true }}
        refreshing={false}
        onRefresh={() => {}}
      >
        <button>Abrir peça</button>
      </ProvidenciaNextStep>,
    );
    expect(html).toContain("Acompanhamento parcialmente indisponível");
    expect(html).toContain("Abrir peça");
    expect(html).not.toContain("Protocolado");
  });
});
