"use client";

import { usePrazosPipeline } from "../../hooks/use-prazos-pipeline";
import type { PipeModo } from "../prazos-view";
import { Board } from "./board";
import { Funil } from "./funil";

// Pipeline = onde o volume está parado (Funil) e o quadro de trabalho (Board).
// Instancia o hook público e alterna entre os dois modos.
export function PipelineView({ modo }: { modo: PipeModo }) {
  const pipeline = usePrazosPipeline();

  return modo === "funil" ? (
    <Funil pipeline={pipeline} />
  ) : (
    <Board pipeline={pipeline} />
  );
}
