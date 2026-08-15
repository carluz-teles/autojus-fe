import {
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fonte única da navegação PRINCIPAL do shell autenticado. Configurações fica no
// rodapé (SidebarFooter), separada; Organização/Integrações/Cobrança/Perfil são
// abas dentro de /settings. A ordem segue a cadeia de valor do AtJud:
// captura (Intimações) → consolidação (Processos) → execução (Tarefas) → partes
// (Contatos) → produção (Peças). Prazos não tem tela própria — só faz sentido no
// contexto do processo (aba Prazos) ou da intimação (painel "Confirmar prazo").
// Várias telas ainda são prévia (layout de referência), preenchidas em fatias
// futuras.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intimacoes", label: "Intimações", icon: Inbox },
  { href: "/processos", label: "Processos", icon: FolderOpen },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/contatos", label: "Contatos", icon: Users },
  { href: "/pecas", label: "Peças", icon: FileText },
];
