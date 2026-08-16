"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";

import { usePortalCredential } from "../hooks/use-portal-credential";
import type { PortalCredential } from "../types";

// Form próprio (NÃO reusa useActivateForm — payload/semântica diferentes:
// aqui é login/senha pessoal validado SINCRONAMENTE pelo BE contra o portal,
// não ativação por OAB). Senha nunca é pré-preenchida ao reconfigurar e é
// sempre limpa ao fechar o Sheet — nunca sobrevive além do submit.
const schema = z.object({
  login: z.string().min(1, "Informe o login."),
  password: z.string().min(1, "Informe a senha."),
});

type Values = z.infer<typeof schema>;

function emptyValues(login = ""): Values {
  return { login, password: "" };
}

export function PortalCredentialSheet({
  open,
  onOpenChange,
  credential,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Credencial atual, se já configurada — semeia o login (nunca a senha). */
  credential: PortalCredential | null;
}) {
  const { save, isSaving, saveError, saveResult, resetSave } =
    usePortalCredential();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(credential?.login),
  });

  // Reseta o form (login prefixado, senha sempre vazia) toda vez que o Sheet
  // abre — cobre tanto "Configurar" (sem credencial) quanto "Reconfigurar"
  // (credencial existente, login conhecido).
  useEffect(() => {
    if (open) {
      reset(emptyValues(credential?.login));
      resetSave();
    }
    // reset/resetSave são estáveis; credential só importa no momento da abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = handleSubmit(async (values) => {
    try {
      await save(values);
      // Senha nunca fica no estado depois daqui — só o login (já conhecido)
      // permanece; o resultado (sem senha) vem da mutation (saveResult).
      reset(emptyValues(values.login));
      // Não fecha automaticamente em nenhum dos dois casos: o usuário vê a
      // confirmação (ACTIVE) ou o aviso de pendência (não-ACTIVE) e fecha
      // quando quiser — o card por trás já reflete o novo estado (query
      // invalidada no hook), então não há corrida entre Sheet e card.
    } catch {
      // erro tratado via saveError (ApiError) abaixo — Sheet permanece aberto,
      // form NÃO é limpo (usuário pode corrigir só a senha).
    }
  });

  const rejected = saveError instanceof ApiError;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset(emptyValues());
        onOpenChange(next);
      }}
    >
      <SheetContent
        title={credential ? "Reconfigurar credencial" : "Configurar credencial"}
        description="TJSP eproc — login e senha pessoais, usados só para consultar seus processos."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {saveResult ? "Fechar" : "Cancelar"}
            </Button>
            <Button
              type="submit"
              form="portal-credential-form"
              disabled={isSaving}
            >
              {isSaving ? "Validando…" : "Salvar e validar"}
            </Button>
          </>
        }
      >
        <form
          id="portal-credential-form"
          onSubmit={submit}
          className="flex flex-col gap-5"
          noValidate
        >
          {/* Texto de proteção — SEMPRE visível, e ANTES do campo de senha no
              DOM (não é só ordem visual: é requisito de acessibilidade/confiança
              que o aviso apareça antes do input sensível na leitura sequencial). */}
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-sm font-medium">Como protegemos sua senha</p>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              Sua senha do eproc TJSP é armazenada de forma criptografada e
              usada apenas para consultar seus processos automaticamente — nunca
              para peticionar, assinar ou realizar qualquer ação em seu nome no
              portal. Ninguém na plataforma, nem nossa equipe, tem acesso à sua
              senha em texto claro. Você pode remover essa credencial a qualquer
              momento.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pc-login">Login</Label>
            <Input
              id="pc-login"
              autoComplete="username"
              aria-describedby="pc-login-help"
              aria-invalid={!!errors.login}
              {...register("login")}
            />
            <p id="pc-login-help" className="text-muted-foreground text-xs">
              Use as mesmas credenciais do seu acesso ao eproc TJSP (login e
              senha).
            </p>
            {errors.login ? (
              <p className="text-destructive text-sm">{errors.login.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pc-password">Senha</Label>
            <Input
              id="pc-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <p className="text-muted-foreground text-xs">
              Recomendamos usar uma senha exclusiva para esta integração, caso o
              portal permita múltiplas senhas. Isso reduz o impacto em caso de
              vazamento.
            </p>
            {errors.password ? (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {rejected ? (
            <p className="text-destructive text-sm" role="alert">
              Não foi possível confirmar seu login. Verifique usuário e senha.
            </p>
          ) : null}

          {saveResult && saveResult.status !== "ACTIVE" ? (
            <p
              className="text-sm text-amber-700 dark:text-amber-500"
              role="status"
            >
              Não foi possível confirmar sua sincronização agora; verificação
              pendente.
            </p>
          ) : null}

          {saveResult && saveResult.status === "ACTIVE" ? (
            <p className="text-primary text-sm" role="status">
              Credencial conectada — última verificação em{" "}
              {formatDateTime(saveResult.last_verified_at)}.
            </p>
          ) : null}
        </form>
      </SheetContent>
    </Sheet>
  );
}
