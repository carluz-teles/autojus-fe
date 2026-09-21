import {
  Bell,
  CalendarDays,
  Clock,
  FolderOpen,
  ListChecks,
  type LucideIcon,
  Mail,
  Settings,
} from "lucide-react";

import { APP_HOME_PATH } from "@/lib/routes";

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
// A intimação é a unidade de trabalho: o antigo board "Providências" (/pipeline)
// saiu do nav — o trabalho vive em Triagem, Meus Prazos e no detalhe da intimação.
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    titulo: "Espaço",
    itens: [
      { href: APP_HOME_PATH, label: "Notificações", icon: Bell },
      { href: "/triagem", label: "Triagem", icon: ListChecks },
      { href: "/meus-prazos", label: "Meus Prazos", icon: Clock },
    ],
  },
  {
    titulo: "Vistas",
    itens: [{ href: "/calendario", label: "Calendário", icon: CalendarDays }],
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
  { href: APP_HOME_PATH, label: "Notificações", icon: Bell },
  { href: "/triagem", label: "Triagem", icon: ListChecks },
  { href: "/meus-prazos", label: "Meus Prazos", icon: Clock },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/processos", label: "Processos", icon: FolderOpen },
  { href: "/intimacoes", label: "Intimações", icon: Mail },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
