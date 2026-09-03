"use client";

import type { usePrazosPipeline } from "../../hooks/use-prazos-pipeline";
import type { PipeModo } from "../prazos-view";
import { Board } from "./board";
import { Funil } from "./funil";

// Pipeline = onde o volume está parado (Funil) e o quadro de trabalho (Board).
// Recebe o resultado de usePrazosPipeline() via prop — chamado uma única vez
// em PrazosPipelineRoute e compartilhado com o contador do header (TopBar),
// sem duplicar a query — e só alterna entre os dois modos de exibição.
export function PipelineView({
  modo,
  pipeline,
}: {
  modo: PipeModo;
  pipeline: ReturnType<typeof usePrazosPipeline>;
}) {
  return modo === "funil" ? (
    <Funil pipeline={pipeline} />
  ) : (
    <Board pipeline={pipeline} />
  );
}
