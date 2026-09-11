"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import {
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import {
  Building2,
  Check,
  ChevronDown,
  LogOut,
  type LucideIcon,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { useUnreadNotifications } from "@/features/notifications/use-notifications";
import { useTriagemCount } from "@/features/triagem/hooks/use-triagem";
import { cn } from "@/lib/utils";

import { NAV_SECTIONS } from "./nav-config";

// Fundos com tinta de marca (accent) nos valores exatos do mockup.
const TINT_12 = "color-mix(in oklch, var(--primary) 12%, transparent)";
const TINT_14 = "color-mix(in oklch, var(--primary) 14%, transparent)";

// Iniciais para avatares/monogramas sem imagem.
function iniciais(nome: string | null | undefined, fallback = "?") {
  const base = nome?.trim() || fallback;
  const partes = base.split(/\s+/).filter(Boolean);
  const chars =
    partes.length > 1
      ? partes[0][0] + partes[partes.length - 1][0]
      : base.slice(0, 2);
  return chars.toUpperCase();
}

// Sidebar com modos completo (224px) e compacto (64px). Topo: organização.
// Meio: navegação
// em seções. Rodapé: menu de usuário. Org/usuário vêm do Clerk (auth real); só o
// visual é portado. "Configurações" NÃO é item de rodapé — vive nos popups.
export function Sidebar() {
  // Contador ao vivo do item "Triagem" — mesma queryKey da própria tela
  // (React Query dedupe: sidebar + página montadas juntas não dobram o fetch).
  const triagemCount = useTriagemCount();
  const unreadNotifications = useUnreadNotifications();

  return (
    <SidebarFrame
      triagemCount={triagemCount}
      unreadCount={unreadNotifications.data?.count}
    />
  );
}

/** Same navigation chrome, without identity/count requests or account actions. */
export function PreviewSidebar({ triagemCount }: { triagemCount: number }) {
  return <SidebarFrame preview triagemCount={triagemCount} />;
}

function PreviewIdentity({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-md font-serif">
        A
      </span>
      {!collapsed ? (
        <div>
          <p className="font-display text-base">Atjus</p>
          <p className="text-muted-foreground text-[10px]">
            Escritório de demonstração
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarFrame({
  triagemCount,
  unreadCount,
  preview = false,
}: {
  triagemCount?: number;
  unreadCount?: number;
  preview?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground fixed top-2 left-4 z-50 -translate-y-20 rounded-lg px-4 py-2 text-sm focus:translate-y-0"
      >
        Ir para o conteúdo
      </a>
      <MobileNavigation
        triagemCount={triagemCount}
        unreadCount={unreadCount}
        preview={preview}
      />
      <aside
        aria-label="Menu principal"
        className={cn(
          "border-line bg-sidebar hidden h-full w-56 shrink-0 flex-col border-r p-2.5 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out md:flex",
          collapsed && "w-16",
        )}
      >
        <div
          className={cn(
            "mb-3 flex items-start gap-1",
            collapsed && "flex-col items-center",
          )}
        >
          <div className="min-w-0 flex-1">
            {preview ? (
              <PreviewIdentity collapsed={collapsed} />
            ) : (
              <OrgSwitcher collapsed={collapsed} />
            )}
          </div>
          <IconAction
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="shrink-0"
            aria-expanded={!collapsed}
            aria-controls="main-navigation"
            onClick={() => setCollapsed((value) => !value)}
          />
        </div>

        <nav
          id="main-navigation"
          aria-label="Navegação principal"
          className="-mx-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1"
        >
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.titulo} className="mt-2">
              <div
                className={cn(
                  "text-fg3 px-[9px] pt-1.5 pb-1 text-[10.5px] font-medium tracking-[0.06em] uppercase",
                  collapsed && "sr-only",
                )}
              >
                {sec.titulo}
              </div>
              {sec.itens.map((item) => (
                <NavItemLink
                  key={item.href}
                  {...item}
                  collapsed={collapsed}
                  preview={preview}
                  count={
                    item.href === "/triagem"
                      ? triagemCount
                      : item.href === "/"
                        ? unreadCount
                        : undefined
                  }
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-line flex-none border-t">
          {preview ? (
            <p className="text-muted-foreground px-2 py-3 text-xs">
              {collapsed ? "Mock" : "Simulação local · sem ações reais"}
            </p>
          ) : (
            <UserSwitcher collapsed={collapsed} />
          )}
        </div>
      </aside>
    </>
  );
}

function MobileNavigation({
  triagemCount,
  unreadCount,
  preview = false,
}: {
  triagemCount?: number;
  unreadCount?: number;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <div className="bg-sidebar flex min-h-12 shrink-0 items-center justify-between gap-3 border-b px-3 md:hidden">
      <div className="max-w-[70%] min-w-0">
        {preview ? <PreviewIdentity /> : <OrgSwitcher collapsed={false} />}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <Dialog.Trigger render={<Button variant="ghost" size="sm" />}>
          <MenuIcon data-icon="inline-start" aria-hidden />
          Menu
        </Dialog.Trigger>
        <SheetContent
          title="Seu escritório"
          description="Navegue pelas áreas de trabalho."
        >
          <nav
            aria-label="Navegação principal no celular"
            className="flex flex-col gap-5"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a[href]"))
                setOpen(false);
            }}
          >
            {NAV_SECTIONS.map((section) => (
              <div key={section.titulo} className="flex flex-col gap-1">
                <p className="section-label mb-1 px-2.5">{section.titulo}</p>
                {section.itens.map((item) => (
                  <NavItemLink
                    key={item.href}
                    {...item}
                    collapsed={false}
                    preview={preview}
                    count={
                      item.href === "/triagem"
                        ? triagemCount
                        : item.href === "/"
                          ? unreadCount
                          : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-5 border-t pt-3">
            {preview ? (
              <p className="text-muted-foreground text-xs">
                Simulação local · sem ações reais
              </p>
            ) : (
              <UserSwitcher
                collapsed={false}
                onNavigate={() => setOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavItemLink({
  href,
  label,
  icon: Icon,
  count,
  collapsed,
  preview = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Contador ao vivo (ex.: Triagem) — badge só aparece quando > 0. */
  count?: number;
  collapsed: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const target = preview
    ? `/dev/fluxo${href === "/" ? "/notificacoes" : href}`
    : href;
  const active =
    pathname === target ||
    pathname.startsWith(`${target}/`) ||
    (preview &&
      href === "/pipeline" &&
      (pathname.startsWith("/dev/fluxo/providencias/") ||
        pathname.startsWith("/dev/fluxo/pecas/") ||
        pathname.startsWith("/dev/fluxo/protocolo/")));
  const accessibleLabel =
    count != null && count > 0 ? `${label} · ${count}` : label;

  return (
    <Tooltip
      label={accessibleLabel}
      side="right"
      disabled={!collapsed}
      render={
        <Link
          href={target}
          aria-label={accessibleLabel}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex min-h-9 items-center gap-2.5 rounded-lg px-[9px] py-2 text-[13px] transition-colors [@media(pointer:coarse)]:min-h-11",
            collapsed && "justify-center py-2.5",
            active
              ? "bg-primary/8 text-foreground font-medium"
              : "text-fg2 hover:bg-hover font-normal",
          )}
        />
      }
    >
      <Icon
        aria-hidden
        strokeWidth={1.8}
        className={cn("size-4 shrink-0", active ? "text-primary" : "text-fg3")}
      />
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>
        {label}
      </span>
      {count != null && count > 0 ? (
        <span
          aria-hidden
          className={cn(
            "bg-primary text-primary-foreground ml-auto grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full px-1 text-[10px] tabular-nums",
            collapsed && "absolute top-1.5 right-1.5 size-1.5 min-w-0 p-0",
          )}
        >
          {collapsed ? null : count}
        </span>
      ) : null}
    </Tooltip>
  );
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { organization } = useOrganization();
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const nome = organization?.name ?? "Sem organização";

  return (
    <Menu.Root>
      <Tooltip label={nome} disabled={!collapsed}>
        <Menu.Trigger
          aria-label={`Organização: ${nome}`}
          title={collapsed ? nome : undefined}
          className={cn(
            "hover:bg-hover flex w-full items-center gap-[9px] rounded-lg px-2 py-1.5 text-left transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          <span
            aria-hidden
            className="font-display text-primary-foreground grid size-6 shrink-0 place-items-center rounded-md text-[14px] leading-none"
            style={{ background: "var(--primary)" }}
          >
            A
          </span>
          <span className={cn("min-w-0 leading-[1.15]", collapsed && "hidden")}>
            <span className="font-display block text-[16px] tracking-[-0.01em]">
              Atjus
            </span>
            <span className="text-fg3 block truncate text-[10.5px]">
              {nome}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "text-fg3 ml-auto size-3 shrink-0",
              collapsed && "hidden",
            )}
          />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50"
        >
          <Menu.Popup
            data-slot="menu-content"
            className="border-line bg-panel shadow-float w-56 max-w-(--available-width) overflow-hidden rounded-xl border p-1.5 outline-none"
          >
            <Menu.Group>
              <div className="text-fg3 px-2.5 pt-[7px] pb-[5px] text-[10px] font-medium tracking-[0.05em] uppercase">
                Organizações
              </div>
              {isLoaded &&
                userMemberships.data?.map((m) => {
                  const ativa = m.organization.id === organization?.id;
                  return (
                    <Menu.Item
                      key={m.organization.id}
                      onClick={() =>
                        setActive?.({ organization: m.organization.id })
                      }
                      className="hover:bg-hover data-highlighted:bg-hover flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left outline-none"
                    >
                      <span
                        className="text-primary grid size-[26px] shrink-0 place-items-center rounded-[7px] text-[10px] font-semibold"
                        style={{ background: TINT_12 }}
                      >
                        {iniciais(m.organization.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">
                          {m.organization.name}
                        </span>
                      </span>
                      {ativa ? (
                        <Check
                          className="text-primary size-3.5 shrink-0"
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </Menu.Item>
                  );
                })}
              <div className="bg-line2 my-[5px] h-px" />
              <Menu.Item
                onClick={() => router.push("/configuracoes")}
                className="hover:bg-hover data-highlighted:bg-hover text-foreground flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
              >
                <Building2 className="text-fg3 size-3.5" strokeWidth={1.8} />
                Configurações da organização
              </Menu.Item>
              <Menu.Item
                onClick={() => router.push("/configuracoes")}
                className="hover:bg-hover data-highlighted:bg-hover text-foreground flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
              >
                <UserPlus className="text-fg3 size-3.5" strokeWidth={1.8} />
                Convidar membros
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function UserSwitcher({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded || !user) {
    return <div className="bg-hover m-2 h-9 animate-pulse rounded-lg" />;
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const nome = user.fullName ?? "Sua conta";
  const ini = iniciais(user.fullName, email ?? "?");

  return (
    <Menu.Root>
      <Tooltip label={nome} disabled={!collapsed}>
        <Menu.Trigger
          aria-label={`Sua conta: ${nome}`}
          title={collapsed ? nome : undefined}
          className={cn(
            "hover:bg-hover flex w-full items-center gap-[9px] p-2 text-left transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          <span
            className="text-primary grid size-[26px] shrink-0 place-items-center rounded-full text-[10px] font-semibold"
            style={{ background: TINT_14 }}
          >
            {ini}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 leading-[1.2]",
              collapsed && "hidden",
            )}
          >
            <span className="block truncate text-[12px] font-medium">
              {nome}
            </span>
            {email ? (
              <span className="text-fg3 block truncate text-[10.5px]">
                {email}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn("text-fg3 size-3 shrink-0", collapsed && "hidden")}
          />
        </Menu.Trigger>
      </Tooltip>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup
            data-slot="menu-content"
            className="border-line bg-panel shadow-float w-56 max-w-(--available-width) overflow-hidden rounded-xl border p-1.5 outline-none"
          >
            <Menu.Group>
              <div className="border-line2 mb-[5px] flex items-center gap-[9px] border-b px-2.5 pt-2 pb-2.5">
                <span
                  className="text-primary grid size-[30px] shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                  style={{ background: TINT_14 }}
                >
                  {ini}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium">
                    {nome}
                  </span>
                  {email ? (
                    <span className="text-fg3 block truncate text-[10.5px]">
                      {email}
                    </span>
                  ) : null}
                </span>
              </div>
              <Menu.Item
                render={<Link href="/configuracoes" />}
                onClick={onNavigate}
                className="hover:bg-hover data-highlighted:bg-hover text-foreground flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[12.5px] outline-none"
              >
                <User className="text-fg3 size-3.5" strokeWidth={1.8} />
                Meu perfil
              </Menu.Item>
              <Menu.Item
                render={<Link href="/configuracoes" />}
                onClick={onNavigate}
                className="hover:bg-hover data-highlighted:bg-hover text-foreground flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[12.5px] outline-none"
              >
                <Settings2 className="text-fg3 size-3.5" strokeWidth={1.8} />
                Preferências
              </Menu.Item>
              <div className="bg-line2 my-[5px] h-px" />
              <Menu.Item
                onClick={() => signOut(() => router.push("/sign-in"))}
                className="hover:bg-hover data-highlighted:bg-hover text-destructive flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
              >
                <LogOut className="size-3.5" strokeWidth={1.8} />
                Sair
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
