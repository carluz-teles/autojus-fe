"use client";

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
  Search,
  Settings2,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useTriagemCount } from "@/features/triagem/hooks/use-triagem";
import { cn } from "@/lib/utils";

import { CommandPalette, useCommandPalette } from "./command-palette";
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

// Sidebar Linear-style, port fiel do Claude Design (lâminas 43-109). Largura fixa
// 224px, sem colapso. Topo: seletor de organização. Abaixo: ⌘K. Meio: navegação
// em seções. Rodapé: menu de usuário. Org/usuário vêm do Clerk (auth real); só o
// visual é portado. "Configurações" NÃO é item de rodapé — vive nos popups.
export function Sidebar() {
  const palette = useCommandPalette();
  // Contador ao vivo do item "Triagem" — mesma queryKey da própria tela
  // (React Query dedupe: sidebar + página montadas juntas não dobram o fetch).
  const triagemCount = useTriagemCount();

  return (
    <>
      <aside className="border-line bg-sidebar hidden h-full w-56 shrink-0 flex-col border-r p-2.5 md:flex">
        <OrgSwitcher />

        <button
          onClick={palette.abrir}
          className="border-line bg-panel text-fg3 hover:bg-hover mb-2.5 flex w-full items-center gap-2 rounded-[7px] border px-[9px] py-[7px] text-[12.5px] transition-colors"
        >
          <Search className="size-3.5" strokeWidth={1.9} />
          Buscar ou comandar
          <span className="border-line bg-hover text-fg3 ml-auto rounded border px-[5px] py-[2px] font-mono text-[10px] leading-none">
            ⌘K
          </span>
        </button>

        <nav className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.titulo} className="mt-2">
              <div className="text-fg3 px-[9px] pt-1.5 pb-1 text-[10.5px] font-medium tracking-[0.06em] uppercase">
                {sec.titulo}
              </div>
              {sec.itens.map((item) => (
                <NavItemLink
                  key={item.href}
                  {...item}
                  count={item.href === "/triagem" ? triagemCount : undefined}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-line flex-none border-t">
          <UserSwitcher />
        </div>
      </aside>
      <CommandPalette aberto={palette.aberto} fechar={palette.fechar} />
    </>
  );
}

function NavItemLink({
  href,
  label,
  icon: Icon,
  count,
}: {
  href: string;
  label: string;
  icon: typeof Search;
  /** Contador ao vivo (ex.: Triagem) — badge só aparece quando > 0. */
  count?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[7px] px-[9px] py-1.5 text-[13px] transition-colors",
        active
          ? "bg-hover text-foreground font-medium"
          : "text-fg2 hover:bg-hover font-normal",
      )}
    >
      <Icon
        strokeWidth={1.8}
        className={cn("size-4 shrink-0", active ? "text-primary" : "text-fg3")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && count > 0 ? (
        <span className="bg-primary text-primary-foreground ml-auto grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full px-1 text-[10px] tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function OrgSwitcher() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const nome = organization?.name ?? "Sem organização";

  return (
    <Menu.Root>
      <Menu.Trigger className="hover:bg-hover mb-3 flex w-full items-center gap-[9px] rounded-lg px-2 py-1.5 text-left transition-colors">
        <span
          aria-hidden
          className="font-display text-primary-foreground grid size-6 shrink-0 place-items-center rounded-md text-[14px] leading-none"
          style={{ background: "var(--primary)" }}
        >
          A
        </span>
        <span className="min-w-0 leading-[1.15]">
          <span className="font-display block text-[16px] tracking-[-0.01em]">
            Atjus
          </span>
          <span className="text-fg3 block truncate text-[10.5px]">{nome}</span>
        </span>
        <ChevronDown className="text-fg3 ml-auto size-3 shrink-0" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4}>
          <Menu.Popup className="border-line bg-panel w-[208px] overflow-hidden rounded-[11px] border p-[5px] shadow-[0_16px_40px_oklch(0.27_0.012_200_/_20%)] outline-none">
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
                    className="hover:bg-hover flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left outline-none"
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
              className="hover:bg-hover text-foreground flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
            >
              <Building2 className="text-fg3 size-3.5" strokeWidth={1.8} />
              Configurações da organização
            </Menu.Item>
            <Menu.Item
              onClick={() => router.push("/configuracoes")}
              className="hover:bg-hover text-foreground flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
            >
              <UserPlus className="text-fg3 size-3.5" strokeWidth={1.8} />
              Convidar membros
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function UserSwitcher() {
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
      <Menu.Trigger className="hover:bg-hover flex w-full items-center gap-[9px] p-2 text-left transition-colors">
        <span
          className="text-primary grid size-[26px] shrink-0 place-items-center rounded-full text-[10px] font-semibold"
          style={{ background: TINT_14 }}
        >
          {ini}
        </span>
        <span className="min-w-0 flex-1 leading-[1.2]">
          <span className="block truncate text-[12px] font-medium">{nome}</span>
          {email ? (
            <span className="text-fg3 block truncate text-[10.5px]">
              {email}
            </span>
          ) : null}
        </span>
        <ChevronDown className="text-fg3 size-3 shrink-0" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={6}>
          <Menu.Popup className="border-line bg-panel w-[208px] overflow-hidden rounded-[11px] border p-[5px] shadow-[0_-12px_40px_oklch(0.27_0.012_200_/_20%)] outline-none">
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
              className="hover:bg-hover text-foreground flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[12.5px] outline-none"
            >
              <User className="text-fg3 size-3.5" strokeWidth={1.8} />
              Meu perfil
            </Menu.Item>
            <Menu.Item
              render={<Link href="/configuracoes" />}
              className="hover:bg-hover text-foreground flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[12.5px] outline-none"
            >
              <Settings2 className="text-fg3 size-3.5" strokeWidth={1.8} />
              Preferências
            </Menu.Item>
            <div className="bg-line2 my-[5px] h-px" />
            <Menu.Item
              onClick={() => signOut(() => router.push("/sign-in"))}
              className="hover:bg-hover text-destructive flex w-full items-center gap-[9px] rounded-lg px-2.5 py-2 text-left text-[12.5px] outline-none"
            >
              <LogOut className="size-3.5" strokeWidth={1.8} />
              Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
