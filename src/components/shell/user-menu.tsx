"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
// (Perfil, Sair) com nossa marcação. Fecha ao clicar fora ou apertar Esc. Sair usa
// useClerk().signOut e volta ao /sign-in.
export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isLoaded || !user) {
    return <div className="bg-muted size-9 animate-pulse rounded-full" />;
  }

  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
        className="ring-offset-background hover:ring-ring focus-visible:ring-ring size-9 overflow-hidden rounded-full ring-1 ring-transparent transition hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="bg-primary/10 text-primary flex size-full items-center justify-center text-sm font-medium">
            {initials(user.fullName, email)}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="bg-popover text-popover-foreground absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border shadow-md"
        >
          <div className="border-b px-3 py-3">
            <p className="truncate text-sm font-medium">
              {user.fullName ?? "Sua conta"}
            </p>
            {email ? (
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            ) : null}
          </div>
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="hover:bg-accent block px-3 py-2 text-sm"
          >
            Perfil
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut(() => router.push("/sign-in"))}
            className="hover:bg-accent block w-full px-3 py-2 text-left text-sm"
          >
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
