// Fonte única da ANIMAÇÃO + do visual de popup de menu (base-ui Menu.Popup), pra TODO
// dropdown/menu do app (⋮ de ações, responsável, filtros, sidebar) ter a MESMA sensação de
// abrir/fechar do Select — slide-por-lado + zoom + fade. `MENU_ANIM` é o pedaço reusável
// (só a animação, sem cor/sombra) pra pendurar em popups que já têm o próprio estilo.
export const MENU_ANIM =
  "origin-(--transform-origin) duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=top]:slide-in-from-bottom-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5 data-[side=inline-end]:slide-in-from-left-1.5 data-[side=inline-start]:slide-in-from-right-1.5";

// Popup de menu completo (cor + sombra + anel + animação) — pros usos que não têm estilo próprio.
export const MENU_POPUP =
  "bg-popover text-popover-foreground ring-foreground/10 z-50 min-w-40 overflow-y-auto rounded-xl p-1.5 shadow-md ring-1 outline-none " +
  MENU_ANIM;

// Item de menu padrão — hover/focus + estado desabilitado, com transição de cor.
export const MENU_ITEM =
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50";
