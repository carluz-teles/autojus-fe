repo: carluz-teles/autojus-fe
branch: main
path: src

## Last sync

date: 2026-08-19T16:28:06Z

### Updated in this project

- Entrada (sign in / sign up) e onboarding em trêsapassos, com a linguagem de `onboarding/copy.ts`.
- Configurações com as seis seções do `settings-nav.tsx` (organização, tribunais, termos, certificado, cobrança, notificações, perfil).
- Detalhe da tarefa (estilo Linear) e cockpit do processo com abas, risco determinístico e próxima providência.
- Sistema de filtros em todas as listas: visões rápidas, drawer combinável e chips ativos (`filter-toolbar.tsx`, `sheet.tsx`).
- Dashboard, Processos, Tarefas, Contatos e Peças desenhados a partir das páginas reais em `src/app/(app)/`.
- Header sticky com breadcrumb, campainha de notificações e menu do usuário, seguindo `app-shell.tsx` e `user-menu.tsx`.
- Rodapé da sidebar com Configurações + versão (`sidebar-footer.tsx`).
- Protótipo do fluxo principal refeito nos tokens reais do produto ("Ledger": Geist + Fraunces, verde-perene, latão).
- Sidebar, KPIs, cards e botões seguindo `components/shell` e `components/ui` do repositório.
- Semântica de status alinhada a `status-badge.tsx` (atraso = destructive, vencendo = gold, resolvido = success).

## Screen map

| Tela do protótipo                        | Arquivos do repositório                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell + sidebar + header                 | src/components/shell/app-shell.tsx, sidebar.tsx, nav-link.tsx, nav-config.ts, sidebar-org.tsx, sidebar-footer.tsx, user-menu.tsx, breadcrumb-context.tsx |
| Intimações — Triagem / Quadro / Prazos   | src/features/intimacoes/, src/components/ui/data-table.tsx, kpi-card.tsx, status-badge.tsx                                                               |
| Detalhe da intimação + providências      | src/components/ui/detail-layout.tsx, checklist-progress.tsx, timeline.tsx                                                                                |
| Peça (construção, assinatura, protocolo) | src/features/pecas/, src/components/ui/ia-panel.tsx                                                                                                      |
| Tokens e tipografia                      | src/app/globals.css, src/app/layout.tsx                                                                                                                  |
| Dashboard                                | src/app/(app)/dashboard/page.tsx, src/components/ui/kpi-card.tsx                                                                                         |
| Processos (lista)                        | src/app/(app)/processos/page.tsx, src/components/ui/data-table.tsx, tabs.tsx, filter-toolbar.tsx                                                         |
| Tarefas (lista)                          | src/app/(app)/tarefas/page.tsx, src/components/ui/kpi-card.tsx, status-badge.tsx                                                                         |
| Contatos (lista)                         | src/app/(app)/contatos/page.tsx                                                                                                                          |
| Peças (lista)                            | src/app/(app)/pecas/page.tsx, src/features/pecas/                                                                                                        |
| Detalhe do processo (cockpit)            | src/features/processos/components/cockpit/*, src/features/processos/lib/risco.ts                                                                         |
| Detalhe da tarefa                        | src/features/tasks/, src/components/ui/detail-layout.tsx                                                                                                 |
| Configurações                            | src/app/(app)/settings/*, src/components/shell/settings-nav.tsx, src/features/integrations/, src/features/organization/, src/features/notifications/     |
| Sign in / sign up                        | src/app/(auth)/layout.tsx, src/lib/clerk-appearance.ts, src/components/shell/brand-mark.tsx                                                              |
| Onboarding                               | src/features/onboarding/copy.ts, components/onboarding-wizard.tsx, components/step3-sources.tsx                                                          |
