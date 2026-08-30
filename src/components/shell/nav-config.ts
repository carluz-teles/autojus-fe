import {
  Calendar,
  Clock,
  Columns3,
  FolderOpen,
  Inbox,
  ListOrdered,
  type LucideIcon,
  Mail,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/prazos", label: "Inbox", icon: Inbox },
      { href: "/prazos/meus", label: "Meus Prazos", icon: Clock },
    ],
  },
  {
    titulo: "Vistas",
    itens: [
      { href: "/prazos/pipeline", label: "Pipeline", icon: Columns3 },
      { href: "/prazos/fila", label: "Fila", icon: ListOrdered },
      { href: "/prazos/calendario", label: "Calendário", icon: Calendar },
    ],
  },
  {
    titulo: "Acervo",
    itens: [
      {
        href: "/prazos/acervo/processos",
        label: "Processos",
        icon: FolderOpen,
      },
      { href: "/prazos/acervo/intimacoes", label: "Intimações", icon: Mail },
    ],
  },
  {
    titulo: "Sistema",
    itens: [{ href: "/prazos/config", label: "Configurações", icon: Settings }],
  },
];

// Lista PLANA de todas as rotas conhecidas — fonte dos rótulos do breadcrumb
// (SEG_LABEL em breadcrumb-context) e dos comandos da paleta ⌘K.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/prazos", label: "Inbox", icon: Inbox },
  { href: "/prazos/meus", label: "Meus Prazos", icon: Clock },
  { href: "/prazos/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/prazos/fila", label: "Fila", icon: ListOrdered },
  { href: "/prazos/calendario", label: "Calendário", icon: Calendar },
  { href: "/prazos/acervo/processos", label: "Processos", icon: FolderOpen },
  { href: "/prazos/acervo/intimacoes", label: "Intimações", icon: Mail },
  { href: "/prazos/config", label: "Configurações", icon: Settings },
];
