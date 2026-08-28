"use client";

import { AlertTriangle, Landmark, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { ConfirmDialog } from "@/components/mock-ui/confirm-dialog";
import { Field, Input } from "@/components/mock-ui/input";
import { Card } from "@/components/mock-ui/layout";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

import {
  useEsajCredentials,
  useRevokeEsajCredential,
  useUploadEsajCredential,
} from "../hooks/use-esaj-credential";

const TERMS_VERSION = "2026-08-28";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

/**
 * Aba "Tribunais" de Configurações: cadastro da credencial e-SAJ (login +
 * senha do advogado) usada pelo protocolo automático de peças no TJSP.
 *
 * Integração real com:
 *   GET    /v1/esaj-credentials    → lista de EsajCredentialView
 *   POST   /v1/esaj-credentials    → 201 EsajCredentialView
 *   DELETE /v1/esaj-credentials/:id → 204
 *
 * A senha trafega exclusivamente para o BE cifrar no cofre KMS — nunca
 * volta em nenhuma leitura, nunca fica no estado além do submit.
 *
 * O RPA que consome esta credencial (`internal/draft/filing_gateway_chromedp.go`)
 * ainda está em calibração contra o e-SAJ real (docs/erd-execucao-judicial-tjsp.md
 * §16) — cadastrar a credencial aqui habilita a opção "Protocolar
 * automaticamente" no step Protocolo da peça, mas o fallback manual continua
 * sempre disponível caso a tentativa falhe.
 */
export function EsajCredentialTab() {
  const {
    data: credenciais,
    isLoading,
    error: listError,
  } = useEsajCredentials();
  const uploadMutation = useUploadEsajCredential();
  const revokeMutation = useRevokeEsajCredential();

  const minhaCredencial = credenciais?.[0] ?? null;

  const [cadastrando, setCadastrando] = useState(false);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [confirmacaoRemocao, setConfirmacaoRemocao] = useState(false);

  function fecharCadastro() {
    setCadastrando(false);
    setLogin("");
    setSenha(""); // limpa a senha do estado — não há persistência além do submit
    setAceite(false);
    uploadMutation.reset();
  }

  async function cadastrar() {
    if (!login || !senha || !aceite) return;
    try {
      await uploadMutation.mutateAsync({
        login,
        password: senha,
        termsVersion: TERMS_VERSION,
      });
      toast.success("Credencial e-SAJ cadastrada.");
      fecharCadastro();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function confirmarRemocao() {
    if (!minhaCredencial) return;
    try {
      await revokeMutation.mutateAsync(minhaCredencial.id);
      toast.success("Credencial e-SAJ removida.");
      setConfirmacaoRemocao(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="mt-7 flex max-w-4xl items-center gap-2 text-sm">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground">Carregando credenciais…</span>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="mt-7 max-w-4xl">
        <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-4 text-[13px]">
          <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
          <span>
            Não foi possível carregar as credenciais.{" "}
            {listError instanceof ApiError
              ? listError.message
              : "Tente recarregar a página."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-7 flex max-w-4xl flex-col gap-4">
      <Card>
        <div className="flex gap-3">
          <Landmark className="text-muted-foreground mt-0.5 size-5" />
          <div>
            <h2 className="font-display text-lg font-medium">
              Credencial e-SAJ (TJSP)
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              {minhaCredencial
                ? "Usada para protocolar peças automaticamente em seu nome no e-SAJ."
                : "Cadastre seu login e senha do e-SAJ para habilitar o protocolo automático de peças."}
            </p>
          </div>
        </div>

        {minhaCredencial ? (
          <dl className="mt-4">
            <div className="border-border flex justify-between gap-3 border-b py-2 text-[13px]">
              <dt className="text-muted-foreground">Login</dt>
              <dd>{minhaCredencial.login}</dd>
            </div>
            <div className="border-border flex justify-between gap-3 border-b py-2 text-[13px]">
              <dt className="text-muted-foreground">Cadastrada em</dt>
              <dd>{formatDate(minhaCredencial.created_at)}</dd>
            </div>
          </dl>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-[color-mix(in_oklch,var(--primary)_3%,transparent)] p-5 text-center">
            <p className="text-muted-foreground text-[13px]">
              Sem credencial e-SAJ cadastrada. O protocolo continua manual até
              cadastrar uma.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              cadastrando ? fecharCadastro() : setCadastrando(true)
            }
          >
            {cadastrando
              ? "Fechar cadastro"
              : minhaCredencial
                ? "Substituir credencial"
                : "Cadastrar credencial"}
          </Button>
          {minhaCredencial && (
            <Button
              variant="outline"
              className="text-destructive border-[color-mix(in_oklch,var(--destructive)_40%,transparent)] hover:bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)]"
              onClick={() => setConfirmacaoRemocao(true)}
            >
              Remover credencial
            </Button>
          )}
        </div>
      </Card>

      {cadastrando && (
        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Login e-SAJ (OAB ou CPF)">
              <Input
                placeholder="ex.: 123456/SP"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Senha do e-SAJ"
              hint="A senha é cifrada no cofre e usada apenas pelo worker de protocolo. Ninguém do escritório consegue vê-la de volta."
            >
              <Input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
              />
            </Field>

            <button
              type="button"
              onClick={() => setAceite((v) => !v)}
              className="grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-3 text-left"
            >
              <span
                className={
                  "mt-0.5 grid size-[18px] flex-none place-items-center rounded border text-[11px] " +
                  (aceite
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background")
                }
              >
                {aceite && "✓"}
              </span>
              <span className="text-muted-foreground text-[12.5px] leading-relaxed">
                Autorizo o uso desta credencial para protocolar peças em meu
                nome no e-SAJ. Todo protocolo automático fica registrado com
                data, hora e comprovante do tribunal.
              </span>
            </button>

            <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
              <AlertTriangle className="text-gold mt-px size-3.5 shrink-0" />O
              protocolo automático ainda está em calibração contra o e-SAJ real
              — se a tentativa falhar, a peça continua disponível para protocolo
              manual.
            </p>

            {uploadMutation.error && (
              <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
                <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                <span>{errorMessage(uploadMutation.error)}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={fecharCadastro}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={
                  !login || !senha || !aceite || uploadMutation.isPending
                }
                onClick={cadastrar}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Cadastrando…
                  </>
                ) : (
                  "Cadastrar credencial"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ConfirmDialog
        aberto={confirmacaoRemocao}
        titulo="Remover credencial e-SAJ?"
        descricao="O protocolo automático deixa de funcionar até que uma nova credencial seja cadastrada. O protocolo manual continua disponível."
        onFechar={() => setConfirmacaoRemocao(false)}
        onConfirmar={confirmarRemocao}
        confirmando={revokeMutation.isPending}
        confirmLabel="Remover"
      />
    </div>
  );
}
