"use client";

// Assistente da peça — dirige o /iterate do BE: o advogado pede um ajuste (texto
// livre ou chip) e a IA devolve PROPOSTAS (diff antigo/proposto). Aceitar aplica a
// mudança DIRETO NO EDITOR VIVO (content_html, a fonte-única) via `applyToEditor` —
// que reflete na hora e dispara o autosave. Sem cache/estruturado paralelo.

import type { PendingChange } from "../types";

/** Proposta = um PendingChange + id de cliente estável + o pedido que a originou. */
export interface Proposta extends PendingChange {
  key: string;
  pedido: string;
}
