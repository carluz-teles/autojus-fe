"use client";

import { Card } from "@/components/ui/card";

import { useProfile } from "../hooks/use-profile";
import { PasswordForm } from "./password-form";
import { PersonalForm } from "./personal-form";

// Painel headless da conta do usuário — substitui o <UserProfile/> do Clerk. Mostra
// avatar + e-mail (read-only), edita nome (user.update) e troca senha
// (user.updatePassword, só se passwordEnabled). Marcação e estilo nossos.
export function ProfilePanel() {
  const {
    isLoaded,
    user,
    email,
    passwordEnabled,
    savingName,
    savingPassword,
    updateName,
    updatePassword,
  } = useProfile();

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
          <div className="size-14 overflow-hidden rounded-full">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="bg-primary/10 text-primary flex size-full items-center justify-center text-lg font-medium">
                {(user.fullName ?? email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.fullName ?? "Sua conta"}
            </p>
            {email ? (
              <p className="text-muted-foreground truncate text-sm">{email}</p>
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
            <h2 className="text-lg font-medium">Segurança</h2>
            <p className="text-muted-foreground text-sm">
              Trocar a senha desconecta as outras sessões.
            </p>
          </div>
          <PasswordForm saving={savingPassword} onSave={updatePassword} />
        </Card>
      ) : null}
    </div>
  );
}
