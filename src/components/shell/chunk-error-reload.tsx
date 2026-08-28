"use client";

import { useEffect } from "react";

// Um deploy troca os hashes de TODOS os chunks (_next/static/chunks/...) — uma
// aba já aberta desde antes do deploy carrega o JS antigo, e a navegação
// client-side (Link/router.push) tenta resolver o payload RSC do build novo
// contra módulos que o runtime antigo não reconhece. O resultado não é um erro
// visível: o React apenas falha em processar a resposta e o navegador acaba
// exibindo o payload cru na tela (ver sessão de QA — reproduzido ao vivo logo
// após o cutover do Clerk, cujo rebuild do FE trocou os hashes).
//
// "Abrir em nova aba" sempre funcionava (carrega HTML+JS frescos do zero) — só
// a navegação DENTRO da aba já aberta quebrava. Fix: detectar a falha de
// carregamento de chunk/módulo (ChunkLoadError do Webpack, ou "Failed to fetch
// dynamically imported module" do ESM nativo/Turbopack) e forçar um reload
// completo — o usuário nunca fica preso, o pior caso é uma navegação que
// recarrega a página em vez de fazer a transição client-side.
const CHUNK_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk|Loading CSS chunk|failed to fetch dynamically imported module|error loading dynamically imported module/i;

// Guarda contra loop de reload: se o reload não resolver (ex.: o deploy novo
// tem o MESMO bug), não fica recarregando pra sempre — tenta uma vez por
// sessão de aba.
const RELOAD_GUARD_KEY = "chunk-error-reload-attempted";

function isChunkError(message: string | undefined, name: string | undefined) {
  if (name === "ChunkLoadError") return true;
  return !!message && CHUNK_ERROR_PATTERN.test(message);
}

function reloadOnce() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
}

export function ChunkErrorReload() {
  useEffect(() => {
    // Uma vez que ESTA carga da página está de pé e estável por alguns
    // segundos, libera a guarda — se um deploy FUTURO quebrar de novo mais
    // tarde na mesma aba (sem fechar), o reload automático volta a valer em
    // vez de ficar travado pelo guard do incidente anterior.
    const clearGuard = window.setTimeout(() => {
      window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
    }, 5000);

    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.message, event.error?.name)) reloadOnce();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const name = reason instanceof Error ? reason.name : undefined;
      if (isChunkError(message, name)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(clearGuard);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
