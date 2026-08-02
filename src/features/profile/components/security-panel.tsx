"use client";

import { useState } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSecurity } from "../hooks/use-security";

const fmtDateTime = (d: Date | null | undefined) =>
  d
    ? d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// Segurança da conta (headless): gerenciar e-mails (adicionar com verificação
// por código, tornar principal, remover) e sessões ativas (listar, encerrar as
// outras). Substitui as abas de segurança do <UserProfile/> do Clerk.
export function SecurityPanel() {
  const {
    currentSessionId,
    emails,
    primaryEmailId,
    sessions,
    isSessionsLoading,
    revokeSession,
    isRevoking,
    addEmail,
    isAddingEmail,
    verifyEmail,
    isVerifyingEmail,
    resendCode,
    setPrimary,
    isSettingPrimary,
    removeEmail,
    isRemovingEmail,
  } = useSecurity();

  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const add = async () => {
    const email = emailDraft.trim().toLowerCase();
    setEmailError(null);
    if (!z.string().email().safeParse(email).success) {
      setEmailError("Informe um e-mail válido.");
      return;
    }
    try {
      await addEmail(email);
      setEmailDraft("");
    } catch {
      setEmailError("Não foi possível adicionar. Tente novamente.");
    }
  };

  const verify = async (emailId: string) => {
    const code = (codes[emailId] ?? "").trim();
    if (!code) return;
    setEmailError(null);
    try {
      await verifyEmail({ emailId, code });
      setCodes((prev) => ({ ...prev, [emailId]: "" }));
    } catch {
      setEmailError("Código inválido. Confira o e-mail e tente de novo.");
    }
  };

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-medium">E-mails</h2>
          <p className="text-muted-foreground text-sm">
            O principal recebe os avisos da plataforma.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {emails.map((em) => {
            const isPrimary = em.id === primaryEmailId;
            const verified = em.verification?.status === "verified";
            return (
              <div
                key={em.id}
                className="flex flex-col gap-3 rounded-lg border px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {em.emailAddress}
                    </span>
                    {isPrimary ? <Badge>Principal</Badge> : null}
                    {!verified ? (
                      <Badge variant="outline">Não verificado</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {verified && !isPrimary ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSettingPrimary}
                        onClick={() => void setPrimary(em.id)}
                      >
                        Tornar principal
                      </Button>
                    ) : null}
                    {!isPrimary ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRemovingEmail}
                        onClick={() => void removeEmail(em.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                {!verified ? (
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`code-${em.id}`} className="text-xs">
                        Código enviado para este e-mail
                      </Label>
                      <Input
                        id={`code-${em.id}`}
                        inputMode="numeric"
                        placeholder="000000"
                        className="h-9 w-32"
                        value={codes[em.id] ?? ""}
                        onChange={(e) =>
                          setCodes((prev) => ({
                            ...prev,
                            [em.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={isVerifyingEmail}
                      onClick={() => void verify(em.id)}
                    >
                      Verificar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void resendCode(em.id)}
                    >
                      Reenviar código
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-end gap-2 border-t pt-4">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="new_email">Adicionar e-mail</Label>
            <Input
              id="new_email"
              type="email"
              inputMode="email"
              placeholder="voce@escritorio.com"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
          </div>
          <Button
            variant="outline"
            disabled={isAddingEmail}
            onClick={() => void add()}
          >
            {isAddingEmail ? "Enviando…" : "Adicionar"}
          </Button>
        </div>
        {emailError ? (
          <p className="text-destructive text-sm" role="alert">
            {emailError}
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-lg font-medium">Sessões ativas</h2>
          <p className="text-muted-foreground text-sm">
            Onde sua conta está conectada agora.
          </p>
        </div>
        {isSessionsLoading ? (
          <p className="text-muted-foreground text-sm">Carregando sessões…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => {
              const act = s.latestActivity;
              const isCurrent = s.id === currentSessionId;
              const device = [act?.browserName, act?.deviceType]
                .filter(Boolean)
                .join(" · ");
              const where = [act?.city, act?.country]
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {device || "Dispositivo"}
                      {isCurrent ? (
                        <Badge variant="secondary">Esta sessão</Badge>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[where, `ativa ${fmtDateTime(s.lastActiveAt)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {!isCurrent ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRevoking}
                      onClick={() => void revokeSession(s.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Encerrar
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
