"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Thesis } from "../../types";
import { TeorDrawer } from "../construction/teor-drawer";
import { ConstructionPrototype } from "./construction-prototype";
import { PreparationCanvas } from "./preparation-canvas";
import { TesesRail } from "./teses-rail";

const initialTheses: Thesis[] = [
  {
    id: "demo-1",
    label: "Delimitar a manifestação aos documentos apresentados",
    foundation:
      "Enfrentar a documentação mencionada na intimação, distinguindo o que está comprovado do que ainda precisa ser esclarecido.",
    sourceLabel: "Intimação de origem · documento demonstrativo",
    sourceExcerpt: "Manifeste-se a parte sobre a documentação apresentada.",
    state: "included",
  },
  {
    id: "demo-2",
    label: "Solicitar esclarecimento sobre a composição do valor",
    foundation:
      "O demonstrativo de exemplo não identifica todos os critérios de atualização. Indicar a lacuna sem presumir índices ou valores.",
    sourceLabel: "Demonstrativo · documento demonstrativo",
    sourceExcerpt:
      "Resumo de valores sem detalhamento dos critérios de atualização.",
    state: "included",
  },
  {
    id: "demo-3",
    label: "Pedir complementação documental",
    foundation:
      "Fundamento opcional: avaliar se a complementação é necessária e compatível com o objetivo da manifestação.",
    sourceLabel: "Intimação de origem · documento demonstrativo",
    sourceExcerpt: "Manifeste-se a parte sobre a documentação apresentada.",
    state: "off",
  },
].map(
  (t, position) =>
    ({
      legalRef: "",
      sourceDocumentId: t.id === "demo-2" ? "statement" : "intimation",
      anchors: [
        {
          documentId: t.id === "demo-2" ? "statement" : "intimation",
          label: t.sourceLabel,
          excerpt: t.sourceExcerpt,
          page: t.id === "demo-2" ? 2 : 1,
          grounded: false,
        },
      ],
      segments: [],
      grounded: false,
      position,
      ...t,
    }) as Thesis,
);

const demoDocuments = [
  {
    id: "intimation",
    title: "Intimação de origem",
    meta: "08/09/2026 · p. 1 · exemplo fictício",
    reason: "Define o objeto desta manifestação.",
    excerpt: "Manifeste-se a parte sobre a documentação apresentada.",
    thesisIds: ["demo-1", "demo-3"],
  },
  {
    id: "statement",
    title: "Demonstrativo de valores",
    meta: "04/09/2026 · pp. 2–3 · exemplo fictício",
    reason:
      "Relacionado ao pedido de esclarecimento dos critérios de atualização.",
    excerpt: "Resumo de valores sem detalhamento dos critérios de atualização.",
    thesisIds: ["demo-2"],
  },
  {
    id: "decision",
    title: "Decisão anterior",
    meta: "01/09/2026 · p. 1 · exemplo fictício",
    reason:
      "Possível limite ao pedido: conferir antes de solicitar novas medidas.",
    excerpt: "A manifestação deve se restringir aos documentos apresentados.",
    thesisIds: ["demo-1"],
    consistencyCheck: true,
  },
];

/** Local simulation only: no API calls or real case data. */
export function PreparationPrototype() {
  const [instructions, setInstructions] = useState(
    "Represento a parte autora. Elaborar manifestação objetiva sobre os documentos apresentados, indicando as lacunas do demonstrativo e os esclarecimentos necessários. Não presumir valores nem solicitar medidas de constrição.",
  );
  const [theses, setTheses] = useState(initialTheses);
  const [openDocument, setOpenDocument] = useState<
    (typeof demoDocuments)[number] | null
  >(null);
  const [generated, setGenerated] = useState(false);
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-10">
        <span className="font-display text-2xl">
          AutosJus<span className="text-primary">.</span>
        </span>
        <Badge variant="outline">
          Protótipo local · dados fictícios · sem chamadas à IA
        </Badge>
      </header>
      {generated ? (
        <ConstructionPrototype
          instructions={instructions}
          theses={theses.filter((thesis) => thesis.state === "included")}
          onBack={() => setGenerated(false)}
          onSource={(id) =>
            setOpenDocument(demoDocuments.find((doc) => doc.id === id) ?? null)
          }
        />
      ) : (
        <PreparationCanvas
          title="Manifestação sobre documentos"
          cnj="Processo demonstrativo"
          instructions={instructions}
          onInstructionsChange={setInstructions}
          selectedCount={theses.filter((t) => t.state === "included").length}
          onGenerate={() => setGenerated(true)}
          sources={
            <div className="flex flex-col items-start gap-3">
              <Button
                variant="outline"
                onClick={() => setOpenDocument(demoDocuments[0])}
              >
                Consultar intimação de origem
              </Button>
              <p className="text-muted-foreground text-xs">
                Abra os autos citados diretamente no fundamento ao lado. As
                fontes deste protótipo são demonstrativas.
              </p>
            </div>
          }
          theses={
            <TesesRail
              theses={theses}
              selectedCount={
                theses.filter((t) => t.state === "included").length
              }
              isLoading={false}
              isError={false}
              isRegenerating={false}
              pregen
              teorSourceId="demo"
              onToggle={(t) =>
                setTheses((list) =>
                  list.map((item) =>
                    item.id === t.id
                      ? {
                          ...item,
                          state: item.state === "included" ? "off" : "included",
                        }
                      : item,
                  ),
                )
              }
              onFonte={(id) =>
                setOpenDocument(
                  demoDocuments.find((doc) => doc.id === id) ?? null,
                )
              }
            />
          }
        />
      )}
      <TeorDrawer
        open={!!openDocument}
        onClose={() => setOpenDocument(null)}
        titulo={openDocument?.title ?? "Documento de origem"}
        tipo="Documento demonstrativo"
        meta={openDocument?.meta ?? ""}
        conteudo={openDocument?.excerpt ?? ""}
      />
    </div>
  );
}
