import {
  Clock,
  Columns3,
  FolderOpen,
  Inbox,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Mail,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contador ao vivo (ex.: badge da Triagem) — opcional; a maioria dos itens
   *  não tem contador estático aqui (nav-config é dado puro). Quando presente,
   *  quem resolve o número em tempo real é o componente (Sidebar), não este
   *  arquivo — aqui o campo só documenta que o item PODE carregar um badge. */
  count?: number;
}

export interface NavSection {
  titulo: string;
  itens: readonly NavItem[];
}

// Estrutura de navegação AUTORITATIVA do design (Claude Design · Prazos Linear).
// 4 seções: ESPAÇO (a caixa de trabalho), VISTAS (recortes dos prazos), ACERVO
// (o material) e SISTEMA. Inbox e Pipeline são destinos distintos do nav — não
// tabs do topo. Todas as telas portadas do rebranding moram sob /prazos/*; os
// itens apontam para as versões "Linear" (as rotas antigas seguem intactas).
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    titulo: "Espaço",
    itens: [
      { href: "/", label: "Inbox", icon: Inbox },
      { href: "/triagem", label: "Triagem", icon: ListChecks },
      { href: "/meus-prazos", label: "Meus Prazos", icon: Clock },
    ],
  },
  {
    titulo: "Vistas",
    itens: [
      { href: "/pipeline", label: "Pipeline", icon: Columns3 },
      { href: "/fila", label: "Fila", icon: ListOrdered },
    ],
  },
  {
    titulo: "Acervo",
    itens: [
      {
        href: "/processos",
        label: "Processos",
        icon: FolderOpen,
      },
      { href: "/intimacoes", label: "Intimações", icon: Mail },
    ],
  },
  {
    titulo: "Sistema",
    itens: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

// Lista PLANA de todas as rotas conhecidas — fonte dos rótulos do breadcrumb
// (SEG_LABEL em breadcrumb-context) e dos comandos da paleta ⌘K.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Inbox", icon: Inbox },
  { href: "/triagem", label: "Triagem", icon: ListChecks },
  { href: "/meus-prazos", label: "Meus Prazos", icon: Clock },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/fila", label: "Fila", icon: ListOrdered },
  { href: "/processos", label: "Processos", icon: FolderOpen },
  { href: "/intimacoes", label: "Intimações", icon: Mail },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
