"use client";

import { useEffect } from "react";

// Bug conhecido do Next.js 16 App Router (reproduzido ao vivo nesta sessão e
// confirmado via relatos externos — ver vercel/next.js discussions #57565 e
// o fórum oficial sobre "_rsc request" travado): o clique num <Link> dispara
// o fetch RSC corretamente (Network mostra 200, payload real chega), mas a
// transição client-side nunca se aplica — a URL/página nunca troca, sem
// nenhum erro de JS. Não é bug do nosso código: reproduzimos numa aba 100%
// fresca, com o <Link> do Next mais simples possível (nav-link.tsx), e o
// preventDefault do handler do próprio Next dispara normal — a falha é
// interna ao router.
//
// Enquanto não há fix upstream, essa rede de segurança observa TODO clique
// num link interno e, se a URL não mudar dentro de um tempo curto, força uma
// navegação completa (MPA) pro destino pretendido — o usuário nunca fica
// preso, o pior caso é perder a transição suave e recarregar a página.
//
// Lê window.location.pathname direto (não usePathname()) de propósito: o
// estado do router do Next é exatamente o que trava nesse bug, então ler o
// pathname real do navegador é o sinal confiável, não o estado do React.
const WATCHDOG_TIMEOUT_MS = 1500;

function isInternalNavigableLink(el: Element | null): HTMLAnchorElement | null {
  const a = el?.closest("a[href]") as HTMLAnchorElement | null;
  if (!a) return null;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/")) return null; // só rotas internas relativas
  if (a.target && a.target !== "_self") return null; // abre em nova aba, não é nosso caso
  return a;
}

export function NavigationWatchdog() {
  useEffect(() => {
    // Registrado sem capture, então roda DEPOIS do onClick do <Link> do
    // Next (mesma fase de bubble, ordem de registro) — event.defaultPrevented
    // já reflete se o Next interceptou o clique quando este handler executa.
    const onClick = (event: MouseEvent) => {
      // Clique modificado (ctrl/cmd/shift/alt/botão do meio) é o usuário
      // pedindo nova aba/janela — o navegador trata nativamente, não mexe.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = isInternalNavigableLink(event.target as Element);
      if (!anchor) return;
      if (!event.defaultPrevented) return; // Next não interceptou — navegação nativa cuida

      const href = anchor.getAttribute("href")!;
      const startPathname = window.location.pathname;
      if (href === startPathname) return; // link pra própria página — sem transição esperada

      window.setTimeout(() => {
        if (window.location.pathname === startPathname) {
          window.location.assign(href);
        }
      }, WATCHDOG_TIMEOUT_MS);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
