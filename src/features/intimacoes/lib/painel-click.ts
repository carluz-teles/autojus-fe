import type { MouseEvent } from "react";

/**
 * Flag POR EVENTO (no evento nativo) que marca um clique como "navegação
 * client-side que muda só a QUERY (?painel=), não o pathname". O
 * NavigationWatchdog respeita esta marca e NÃO força um full-nav (ele assume
 * falha do router do Next quando o pathname não muda em 1500ms — o que é
 * legítimo aqui, pois só o painel abre). É por evento (não um data-attr fixo no
 * <a>): só o clique de fato tratado in-place é isento; o mesmo link continua um
 * deep-link real para nova aba / sem-JS, e nenhum outro listener global (ex.:
 * analytics) é bloqueado — não usamos stopPropagation. */
export interface PanelHandledEvent {
  __panelHandled?: boolean;
}

export function marcarPainelHandled(nativeEvent: object) {
  (nativeEvent as PanelHandledEvent).__panelHandled = true;
}

export function isPanelHandled(nativeEvent: object): boolean {
  return (nativeEvent as PanelHandledEvent).__panelHandled === true;
}

/**
 * Interceptador de clique do título de uma linha: abre no painel contextual
 * in-place (docs/revamp-mesa-trabalho-intimacoes.md §4) num clique simples;
 * deixa o navegador tratar normalmente (nova aba/janela, clique do meio) para
 * clique com modificador. O `href` real do `<Link>` continua o deep-link
 * completo do detalhe — leitores de tela, "abrir em nova aba" e navegação sem
 * JS seguem funcionando.
 */
export function onClickAbrirPainel(
  e: MouseEvent,
  onAbrir: (() => void) | undefined,
) {
  if (!onAbrir) return;
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  // Isenta ESTE clique do NavigationWatchdog (só a query muda; sem full-nav).
  marcarPainelHandled(e.nativeEvent);
  onAbrir();
}

/** A área livre da linha navega; os controles internos mantêm suas ações. */
export function onClickAbrirLinha(
  e: MouseEvent<HTMLElement>,
  onAbrir: (() => void) | undefined,
) {
  const target = e.target;
  if (!(target instanceof Element) || !e.currentTarget.contains(target)) return;
  if (
    target.closest(
      'a, button, input, select, textarea, label, summary, [role="button"], [role="checkbox"], [role^="menuitem"], [contenteditable="true"]',
    )
  )
    return;
  if (window.getSelection()?.toString()) return;
  onClickAbrirPainel(e, onAbrir);
}
