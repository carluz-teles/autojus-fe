"use client";

import { Menu } from "@base-ui/react/menu";
import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Iniciais para o fallback do avatar (sem imagem).
function initials(name: string | null | undefined, email: string | undefined) {
  const base = name?.trim() || email || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  const chars =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : base.slice(0, 2);
  return chars.toUpperCase();
}

// Menu do usuário headless — substitui o <UserButton/> do Clerk. Avatar + dropdown
// (Perfil, Sair) com nossa marcação, sobre o Menu do base-ui (foco-trap, escape,
// clique-fora, portal e animação de entrada/saída de graça — mesmo motor do
// Sheet). Sair usa useClerk().signOut e volta ao /sign-in.
export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded || !user) {
    return <div className="bg-muted size-9 animate-pulse rounded-full" />;
  }

  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Menu do usuário"
        className="border-border ring-offset-background hover:ring-ring focus-visible:ring-ring size-9 overflow-hidden rounded-full border transition hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="bg-primary/10 text-primary flex size-full items-center justify-center text-sm font-medium">
            {initials(user.fullName, email)}
          </span>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup className="bg-popover text-popover-foreground w-56 overflow-hidden rounded-lg border shadow-md transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="border-b px-3 py-3">
              <p className="truncate text-sm font-medium">
                {user.fullName ?? "Sua conta"}
              </p>
              {email ? (
                <p className="text-muted-foreground truncate text-xs">
                  {email}
                </p>
              ) : null}
            </div>
            <Menu.Item
              render={<Link href="/settings?tab=perfil" />}
              className="hover:bg-accent block px-3 py-2 text-sm outline-none"
            >
              Perfil
            </Menu.Item>
            <Menu.Item
              onClick={() => signOut(() => router.push("/sign-in"))}
              className="hover:bg-accent block w-full px-3 py-2 text-left text-sm outline-none"
            >
              Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
