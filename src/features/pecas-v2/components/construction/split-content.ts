// split-content — parte o HTML da peça em torno da seção "Do direito" (o
// heading de romano "II"), pra que o editor renderize:
//   [ RichEditor topo ]  (preâmbulo + seção I "Dos fatos")
//   [ DireitoTeses    ]  (seção II — teses com aprovação inline)
//   [ RichEditor base ]  (seção III+ "Dos pedidos" etc.)
//
// A seção "Do direito" gerada pela IA (texto corrido) é SUBSTITUÍDA pelo bloco
// interativo de teses — a fonte da verdade das teses é o contrato Teses (estado
// propor→aprovar por tese), não o texto redigido. Por isso o corpo original da
// seção II é descartado do fluxo editável (fica coberto pelos blocos de tese).
//
// A detecção do heading II é tolerante: casa <h1..h3> cujo texto começa com o
// romano "II" (com ou sem separador/título) OU cujo data-roman="II". Se não
// achar, devolve todo o HTML no topo e vazio embaixo (fallback seguro — o
// editor ainda funciona, só sem a fatia de teses interleaved).

/** Resultado do split: HTML editável antes e depois da seção "Do direito". */
export interface SplitContent {
  /** Preâmbulo + seção I (antes do heading "II"). */
  top: string;
  /** Seção III+ (a partir do heading seguinte ao "II"). Vazio se não houver. */
  bottom: string;
  /** Achou a seção "Do direito" (para saber se interleava as teses). */
  hasDireito: boolean;
}

const HEADING = /^H[1-3]$/;

/** Casa um heading de "Do direito": data-roman="II" ou texto começando por
 *  "II" seguido de fim/separador (evita casar "III"). */
function isDireitoHeading(el: Element): boolean {
  if ((el.getAttribute("data-roman") ?? "").trim().toUpperCase() === "II") {
    return true;
  }
  const text = (el.textContent ?? "").trim();
  return /^II(?:\b)(?!I)/.test(text) || /^II\s*(?:—|-|:|$)/.test(text);
}

/** Casa qualquer heading de nível de seção (para achar o "próximo" após o II). */
function isSectionHeading(el: Element): boolean {
  return HEADING.test(el.tagName);
}

export function splitAroundDireito(html: string): SplitContent {
  if (typeof document === "undefined") {
    // SSR: sem DOM, não dá pra parsear — devolve tudo no topo (o client
    // re-renderiza e refaz o split com DOM disponível).
    return { top: html, bottom: "", hasDireito: false };
  }
  const root = document.createElement("div");
  root.innerHTML = html;
  const children = Array.from(root.children);

  const direitoIdx = children.findIndex(
    (el) => isSectionHeading(el) && isDireitoHeading(el),
  );
  if (direitoIdx === -1) {
    return { top: html, bottom: "", hasDireito: false };
  }

  // topo = tudo antes do heading "II".
  const topNodes = children.slice(0, direitoIdx);

  // Acha o próximo heading de seção após o "II" — o corpo entre eles é o texto
  // corrido da seção "Do direito", que descartamos (as teses o substituem).
  let nextIdx = -1;
  for (let i = direitoIdx + 1; i < children.length; i++) {
    if (isSectionHeading(children[i])) {
      nextIdx = i;
      break;
    }
  }
  const bottomNodes = nextIdx === -1 ? [] : children.slice(nextIdx);

  const toHtml = (nodes: Element[]) => nodes.map((n) => n.outerHTML).join("\n");
  return {
    top: toHtml(topNodes),
    bottom: toHtml(bottomNodes),
    hasDireito: true,
  };
}
