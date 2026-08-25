"use client";

// Renderiza o diff word-level entre a versão antiga e a nova de uma seção
// (ou preâmbulo). Usado quando o editor entra em modo preview depois de uma
// iteração. Aceitar/Rejeitar são renderizados fora (barra flutuante no topo
// do canvas), aqui só cuidamos da visualização inline.

import { wordDiff } from "../../lib/word-diff";

interface Props {
  oldParagraphs: string[];
  newParagraphs: string[];
}

export function DiffView({ oldParagraphs, newParagraphs }: Props) {
  const oldText = oldParagraphs.join("\n\n");
  const newText = newParagraphs.join("\n\n");
  const chunks = wordDiff(oldText, newText);

  // Reagrupa por parágrafo pra preservar a estrutura visual. O diff pode ter
  // \n\n dentro de um chunk — quebramos e emitimos <p> por segmento.
  const paragraphs: React.ReactNode[] = [];
  let buffer: React.ReactNode[] = [];
  let paraIndex = 0;

  const flushPara = () => {
    paragraphs.push(<p key={`p-${paraIndex++}`}>{buffer}</p>);
    buffer = [];
  };

  chunks.forEach((c, i) => {
    const segments = c.text.split(/\n{2,}/);
    segments.forEach((seg, si) => {
      if (si > 0) flushPara();
      if (!seg) return;
      if (c.op === "eq") {
        buffer.push(<span key={`c-${i}-${si}`}>{seg}</span>);
      } else if (c.op === "ins") {
        buffer.push(
          <ins key={`c-${i}-${si}`} className="diff-ins">
            {seg}
          </ins>,
        );
      } else {
        buffer.push(
          <del key={`c-${i}-${si}`} className="diff-del">
            {seg}
          </del>,
        );
      }
    });
  });
  if (buffer.length > 0) flushPara();

  return <>{paragraphs}</>;
}
