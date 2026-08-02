"use client";

import { Pencil } from "lucide-react";
import { useRef } from "react";

import { Card } from "@/components/ui/card";

import { useProfile } from "../hooks/use-profile";
import { PasswordForm } from "./password-form";
import { PersonalForm } from "./personal-form";
import { SecurityPanel } from "./security-panel";

// Painel headless da conta do usuário — substitui o <UserProfile/> do Clerk. Mostra
// avatar + e-mail (read-only), edita nome (user.update) e troca senha
// (user.updatePassword, só se passwordEnabled). Marcação e estilo nossos.
export function ProfilePanel() {
  const {
    isLoaded,
    user,
    email,
    passwordEnabled,
    photoUrl,
    uploadPhoto,
    uploadingPhoto,
    photoError,
    savingName,
    savingPassword,
    updateName,
    updatePassword,
  } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isLoaded || !user) {
    return (
      <div className="text-muted-foreground reveal mt-8 text-sm">
        Carregando perfil…
      </div>
    );
  }

  return (
    <div className="reveal mt-8 flex flex-col gap-8">
      <Card className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          {/* Avatar editável: overlay de caneta, upload imediato ao escolher. */}
          <button
            type="button"
            aria-label="Editar foto"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="group focus-visible:ring-ring/50 relative shrink-0 rounded-full outline-none focus-visible:ring-3 disabled:opacity-60"
          >
            <span className="bg-muted ring-border flex size-16 items-center justify-center overflow-hidden rounded-full ring-1">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Sua foto"
                  className="size-full object-cover"
                />
              ) : (
                <span className="bg-primary/10 text-primary flex size-full items-center justify-center text-lg font-medium">
                  {(user.fullName ?? email ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="bg-primary text-primary-foreground ring-card absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full shadow-sm ring-2 transition-transform group-hover:scale-110">
              <Pencil className="size-3" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
              e.target.value = "";
            }}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.fullName ?? "Sua conta"}
            </p>
            {email ? (
              <p className="text-muted-foreground truncate text-sm">{email}</p>
            ) : null}
            {photoError ? (
              <p className="text-destructive text-sm" role="alert">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
        <div className="border-t pt-6">
          <h2 className="mb-4 text-lg font-medium">Dados pessoais</h2>
          <PersonalForm
            defaults={{
              first_name: user.firstName ?? "",
              last_name: user.lastName ?? "",
            }}
            saving={savingName}
            onSave={updateName}
          />
        </div>
      </Card>

      {passwordEnabled ? (
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-medium">Senha</h2>
            <p className="text-muted-foreground text-sm">
              Trocar a senha desconecta as outras sessões.
            </p>
          </div>
          <PasswordForm saving={savingPassword} onSave={updatePassword} />
        </Card>
      ) : null}

      <SecurityPanel />
    </div>
  );
}
