// @vitest-environment jsdom
import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  isPanelHandled,
  marcarPainelHandled,
  onClickAbrirLinha,
  onClickAbrirPainel,
} from "./painel-click";

/** Simula o evento sintético do React com o campo nativeEvent que o
 *  NavigationWatchdog acaba recebendo (o mesmo objeto nativo). */
function fakeEvent(over: Partial<MouseEvent> = {}) {
  const nativeEvent = {} as object;
  let defaultPrevented = false;
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
    nativeEvent,
    ...over,
  } as unknown as MouseEvent & { nativeEvent: object };
}

describe("onClickAbrirPainel + opt-out do NavigationWatchdog", () => {
  it("clique simples: previne o Link, marca o evento nativo como painel-handled e abre o painel", () => {
    const onAbrir = vi.fn();
    const e = fakeEvent();
    onClickAbrirPainel(e, onAbrir);
    expect(e.defaultPrevented).toBe(true);
    expect(onAbrir).toHaveBeenCalledTimes(1);
    // é ESSA marca que faz o watchdog não forçar full-nav quando só a query muda
    expect(isPanelHandled(e.nativeEvent)).toBe(true);
  });

  it("clique com modificador (nova aba) NÃO é tratado: sem preventDefault, sem marca, sem abrir painel", () => {
    const onAbrir = vi.fn();
    const e = fakeEvent({ metaKey: true });
    onClickAbrirPainel(e, onAbrir);
    expect(e.defaultPrevented).toBe(false);
    expect(onAbrir).not.toHaveBeenCalled();
    expect(isPanelHandled(e.nativeEvent)).toBe(false);
  });

  it("botão do meio (button!=0) não é tratado", () => {
    const onAbrir = vi.fn();
    const e = fakeEvent({ button: 1 });
    onClickAbrirPainel(e, onAbrir);
    expect(onAbrir).not.toHaveBeenCalled();
    expect(isPanelHandled(e.nativeEvent)).toBe(false);
  });

  it("sem onAbrir (deep-link puro): não previne nem marca — o watchdog segue protegendo", () => {
    const e = fakeEvent();
    onClickAbrirPainel(e, undefined);
    expect(e.defaultPrevented).toBe(false);
    expect(isPanelHandled(e.nativeEvent)).toBe(false);
  });

  it("marcarPainelHandled/isPanelHandled operam sobre o mesmo objeto de evento nativo", () => {
    const native = {} as object;
    expect(isPanelHandled(native)).toBe(false);
    marcarPainelHandled(native);
    expect(isPanelHandled(native)).toBe(true);
  });
});

describe("clique na área da linha", () => {
  it("abre pelo conteúdo livre do card", () => {
    const row = document.createElement("div");
    const text = row.appendChild(document.createElement("span"));
    const open = vi.fn();
    onClickAbrirLinha(
      fakeEvent({
        target: text,
        currentTarget: row,
      }) as MouseEvent<HTMLElement>,
      open,
    );
    expect(open).toHaveBeenCalledOnce();
  });

  it.each([
    "<button><span>Confirmar</span></button>",
    '<button aria-label="Responsável"><span>Nome</span></button>',
    '<button role="checkbox"><span>Selecionar</span></button>',
    '<a href="/intimacoes/id"><span>Título</span></a>',
  ])("não abre ao interagir com %s", (markup) => {
    const row = document.createElement("div");
    row.innerHTML = markup;
    const open = vi.fn();
    onClickAbrirLinha(
      fakeEvent({
        target: row.querySelector("span")!,
        currentTarget: row,
      }) as MouseEvent<HTMLElement>,
      open,
    );
    expect(open).not.toHaveBeenCalled();
  });
});
