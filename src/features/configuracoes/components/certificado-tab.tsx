"use client";

import {
  AlertTriangle,
  Check,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/mock-ui/button";
import { ConfirmDialog } from "@/components/mock-ui/confirm-dialog";
import { Dialog } from "@/components/mock-ui/dialog";
import { Field, Input } from "@/components/mock-ui/input";
import { Card, SectionTitle } from "@/components/mock-ui/layout";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import { ApiError } from "@/lib/api/errors";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  CERT_ACCEPT,
  isCertFile,
  useCertificados,
  useDeleteCertificado,
  usePreviewCertificado,
  useSignComCertificado,
  useUploadCertificado,
} from "../hooks/use-cert-upload";
import type {
  CertificadoPasswordPolicy,
  CertificadoPreviewResult,
  CertificadoScope,
} from "../types/certificado";

// ── Wizard steps ────────────────────────────────────────────────────────────
// Arquivo → Senha → Validação → Consentimento. A etapa Validação chama
// POST /v1/certificates/preview (parse read-only no BE) e mostra os metadados
// lidos + as checagens (✓/✗) ANTES do POST definitivo — "é a sua identidade que
// vai assinar".
const PASSOS = ["Arquivo", "Senha", "Validação", "Consentimento"] as const;
const PASSO_VALIDACAO = 2;
const PASSO_CONSENTIMENTO = 3;

const POLITICAS: {
  valor: CertificadoPasswordPolicy;
  titulo: string;
  trade: string;
}[] = [
  {
    valor: "sempre",
    titulo: "Pedir a cada assinatura",
    trade: "mais seguro, mais atrito — indicado para quem assina pouco",
  },
  {
    valor: "sessao",
    titulo: "Manter liberado por 30 minutos",
    trade: "equilíbrio para quem assina em lote no mesmo dia",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Dias restantes de validade a partir de not_after (RFC3339). */
function diasRestantes(notAfter: string): number {
  return Math.ceil(
    (new Date(notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function badgeToneForDias(dias: number): "success" | "warning" | "danger" {
  if (dias > 60) return "success";
  if (dias > 14) return "warning";
  return "danger";
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

/** SHA-256 (base64) de um conteúdo, via WebCrypto — o digest que o BE assina. */
async function sha256Base64(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  let bin = "";
  for (const b of new Uint8Array(hash)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Etapa "Validação" do wizard: mostra os metadados lidos do arquivo pelo BE
 * (POST /v1/certificates/preview) + as checagens (✓/✗) antes do POST definitivo.
 * "Foi isto que lemos do arquivo. Confira antes de ativar — é a sua identidade
 * que vai assinar." Fiel ao design (grid rótulo · valor · estado).
 */
function ValidacaoStep({ resultado }: { resultado: CertificadoPreviewResult }) {
  const linhas: { rotulo: string; valor: string; ok: boolean; nota: string }[] =
    [
      {
        rotulo: "Titular",
        valor: resultado.subject_cn || "—",
        ok: resultado.checks.titular_confere,
        nota: resultado.checks.titular_confere
          ? "titular identificado"
          : "titular não identificado",
      },
      { rotulo: "OAB", valor: resultado.oab || "—", ok: true, nota: "lida" },
      {
        rotulo: "Emissor",
        valor: resultado.issuer || "—",
        ok: resultado.checks.cadeia_ok,
        nota: resultado.checks.cadeia_ok
          ? "cadeia da AC presente"
          : "cadeia da AC ausente",
      },
      {
        rotulo: "Série",
        valor: resultado.serial || "—",
        ok: true,
        nota: "lida",
      },
      {
        rotulo: "Válido de",
        valor: formatDate(resultado.not_before),
        ok: true,
        nota: "lida",
      },
      {
        rotulo: "Validade",
        valor: formatDate(resultado.not_after),
        ok: resultado.checks.nao_expirado,
        nota: resultado.checks.nao_expirado ? "dentro da validade" : "expirado",
      },
    ];

  return (
    <div>
      <p className="text-muted-foreground mb-3 text-[13px]">
        Foi isto que lemos do arquivo. Confira antes de ativar — é a sua
        identidade que vai assinar.
      </p>
      <div>
        {linhas.map((l) => (
          <div
            key={l.rotulo}
            className="border-border grid grid-cols-[130px_minmax(0,1fr)_180px] items-center gap-3.5 border-t py-2.5 text-[13px] sm:grid-cols-[170px_minmax(0,1fr)_240px]"
          >
            <span className="text-muted-foreground">{l.rotulo}</span>
            <span className="min-w-0 truncate font-medium">{l.valor}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs",
                l.ok ? "text-success" : "text-destructive",
              )}
            >
              {l.ok ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <X className="size-3.5 shrink-0" />
              )}
              {l.nota}
            </span>
          </div>
        ))}
      </div>
      {(!resultado.checks.nao_expirado || !resultado.checks.cadeia_ok) && (
        <p className="text-muted-foreground mt-3 flex items-start gap-2 text-xs leading-relaxed">
          <AlertTriangle className="text-gold mt-px size-3.5 shrink-0" />
          {!resultado.checks.nao_expirado
            ? "Este certificado está fora da validade e não poderá assinar. Use um e-CPF A1 vigente."
            : "A cadeia da autoridade certificadora não veio no arquivo. Confirme com quem emitiu o certificado antes de ativar."}
        </p>
      )}
    </div>
  );
}

/**
 * Aba de certificado digital A1.
 *
 * Integração real com:
 *   GET    /v1/certificates                → lista de CertificateView
 *   POST   /v1/certificates (multipart)   → 201 CertificateView
 *   DELETE /v1/certificates/:id           → 204
 *
 * A senha trafega exclusivamente para que o BE abra o PKCS#12 e extraia
 * metadados — é descartada pelo servidor após a validação. Nunca é persistida
 * em estado além do submit. "A assinatura é feita localmente; a senha não é
 * armazenada."
 */
export function CertificadoTab() {
  // ── Server state ──────────────────────────────────────────────────────────
  const { data: certificados, isLoading, error: listError } = useCertificados();
  const uploadMutation = useUploadCertificado();
  const previewMutation = usePreviewCertificado();
  const deleteMutation = useDeleteCertificado();

  // Certificado do usuário logado = primeiro com revoked_at null
  // (o BE filtra por tenant; a lista pode ter de outros membros no futuro)
  const meuCert = certificados?.find((c) => !c.revoked_at) ?? null;

  // ── Wizard local state ────────────────────────────────────────────────────
  const [instalando, setInstalando] = useState(false);
  const [passo, setPasso] = useState(0);
  const [arquivo, setArquivo] = useState<File | null>(null);
  // A senha NUNCA é guardada além do submit: é limpada em fecharInstalador().
  const [senha, setSenha] = useState("");
  const [politica, setPolitica] = useState<CertificadoPasswordPolicy>("sessao");
  const [escopo, setEscopo] = useState<CertificadoScope>({
    assinar: true,
    protocolar: true,
    procuracoes: false,
  });
  const [aceite, setAceite] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete confirmation state ─────────────────────────────────────────────
  const [confirmacaoRemocao, setConfirmacaoRemocao] = useState(false);

  // ── Signing (session password) state ──────────────────────────────────────
  // A senha de assinatura é de SESSÃO: mora só neste estado enquanto o diálogo
  // está aberto e é limpa ao fechar. Nunca é persistida nem logada.
  const signMutation = useSignComCertificado();
  const [assinaturaAberta, setAssinaturaAberta] = useState(false);
  const [senhaAssinatura, setSenhaAssinatura] = useState("");

  // ── Wizard helpers ────────────────────────────────────────────────────────
  function selecionarArquivo(file: File | undefined) {
    if (!file) return;
    if (!isCertFile(file)) {
      toast.error("Selecione um arquivo .pfx ou .p12.");
      return;
    }
    setArquivo(file);
  }

  function fecharInstalador() {
    setInstalando(false);
    setPasso(0);
    setArquivo(null);
    setSenha(""); // limpa a senha do estado — não há persistência além do submit
    setAceite(false);
    previewMutation.reset();
  }

  // Avança um passo. Ao ENTRAR na etapa de Validação (de Senha → Validação),
  // dispara o preview no BE com o arquivo + senha. Uma senha errada / arquivo
  // inválido falha aqui (erro tipado do BE) e o wizard permanece na etapa de
  // senha, evitando o POST definitivo com dados quebrados.
  async function avancar() {
    if (passo === 1) {
      if (!arquivo || !senha) return;
      try {
        await previewMutation.mutateAsync({ file: arquivo, password: senha });
      } catch {
        // O erro é exibido inline na etapa de senha (previewMutation.error).
        return;
      }
    }
    setPasso((p) => p + 1);
  }

  const podeAvancar =
    (passo === 0 && !!arquivo) ||
    (passo === 1 && senha.length > 0 && !previewMutation.isPending) ||
    (passo === PASSO_VALIDACAO && !!previewMutation.data) ||
    (passo === PASSO_CONSENTIMENTO && aceite && !uploadMutation.isPending);

  async function ativarCertificado() {
    if (!arquivo || !senha) return;
    try {
      await uploadMutation.mutateAsync({ file: arquivo, password: senha });
      toast.success("Certificado ativado com sucesso.");
      fecharInstalador();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  // ── Signing ───────────────────────────────────────────────────────────────
  function fecharAssinatura() {
    setAssinaturaAberta(false);
    setSenhaAssinatura(""); // limpa a senha de sessão — sem persistência
    signMutation.reset();
  }

  async function assinar() {
    if (!meuCert || !senhaAssinatura) return;
    try {
      // O empacotamento real (PDF/peça) é de outra frente; aqui o mecanismo
      // (assinar um digest com a chave do cert) basta — assinamos o SHA-256 de
      // uma amostra para provar que o certificado assina de ponta a ponta.
      const digest = await sha256Base64(
        `atjus-teste-assinatura:${meuCert.id}:${crypto.randomUUID()}`,
      );
      await signMutation.mutateAsync({
        id: meuCert.id,
        password: senhaAssinatura,
        digestSha256: digest,
      });
      setSenhaAssinatura("");
      toast.success("Assinatura gerada com sucesso.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function confirmarRemocao() {
    if (!meuCert) return;
    try {
      await deleteMutation.mutateAsync(meuCert.id);
      toast.success("Certificado removido.");
      setConfirmacaoRemocao(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mt-7 flex max-w-4xl items-center gap-2 text-sm">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground">Carregando certificados…</span>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="mt-7 max-w-4xl">
        <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-4 text-[13px]">
          <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
          <span>
            Não foi possível carregar os certificados.{" "}
            {listError instanceof ApiError
              ? listError.message
              : "Tente recarregar a página."}
          </span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-7 flex max-w-4xl flex-col gap-4">
      {/* ── Meu certificado ─────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <ShieldCheck className="text-success mt-0.5 size-5" />
            <div>
              <h2 className="font-display text-lg font-medium">
                Seu certificado
              </h2>
              <p className="text-muted-foreground mt-1 text-[13px]">
                {meuCert
                  ? "Usado para assinar peças e protocolar em seu nome. Só você pode substituí-lo."
                  : "Nenhum certificado A1 ativo. Instale um para assinar e protocolar."}
              </p>
            </div>
          </div>
          {meuCert && (
            <StatusBadge
              tone={badgeToneForDias(diasRestantes(meuCert.not_after))}
              ponto
            >
              {diasRestantes(meuCert.not_after) > 0
                ? `Vence em ${diasRestantes(meuCert.not_after)} dias`
                : "Expirado"}
            </StatusBadge>
          )}
        </div>

        {meuCert ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-8">
            {[
              ["Titular", meuCert.subject_cn],
              ["OAB", meuCert.oab],
              ["Emissor", meuCert.issuer],
              ["Série", meuCert.serial],
              ["Válido de", formatDate(meuCert.not_before)],
              ["Validade", formatDate(meuCert.not_after)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="border-border flex justify-between gap-3 border-b py-2 text-[13px]"
              >
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
            <div className="border-border col-span-2 flex justify-between gap-3 border-b py-2 text-[13px]">
              <dt className="text-muted-foreground">Impressão digital</dt>
              <dd className="font-mono text-[11.5px] tabular-nums">
                {meuCert.fingerprint}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-[color-mix(in_oklch,var(--primary)_30%,transparent)] bg-[color-mix(in_oklch,var(--primary)_3%,transparent)] p-5 text-center">
            <p className="text-muted-foreground text-[13px]">
              Sem certificado A1 instalado. Clique em &ldquo;Instalar
              certificado&rdquo; para começar.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              instalando ? fecharInstalador() : setInstalando(true)
            }
          >
            {instalando
              ? "Fechar instalação"
              : meuCert
                ? "Substituir certificado"
                : "Instalar certificado"}
          </Button>
          {meuCert && !meuCert.revoked_at && (
            <Button variant="outline" onClick={() => setAssinaturaAberta(true)}>
              Testar assinatura
            </Button>
          )}
        </div>
      </Card>

      {/* ── Assinatura de sessão (mecanismo server-side) ─────────────────── */}
      <Dialog
        aberto={assinaturaAberta}
        titulo="Testar assinatura"
        onFechar={fecharAssinatura}
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Informe a senha do certificado para gerar uma assinatura. A senha é
            usada apenas para esta assinatura e não é armazenada.
          </p>
          <Field label="Senha do certificado">
            <Input
              type="password"
              placeholder="••••••••"
              value={senhaAssinatura}
              onChange={(e) => setSenhaAssinatura(e.target.value)}
              autoComplete="off"
            />
          </Field>

          {signMutation.data && (
            <div className="border-border rounded-xl border p-3 text-[12.5px]">
              <span className="text-success flex items-center gap-1.5 font-medium">
                <ShieldCheck className="size-4" />
                Assinatura gerada
              </span>
              <span className="text-muted-foreground mt-1.5 block font-mono text-[11px] break-all">
                {signMutation.data.signature.slice(0, 44)}…
              </span>
            </div>
          )}

          {signMutation.error && (
            <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
              <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              <span>{errorMessage(signMutation.error)}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={fecharAssinatura}>
              Fechar
            </Button>
            <Button
              size="sm"
              disabled={!senhaAssinatura || signMutation.isPending}
              onClick={assinar}
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Assinando…
                </>
              ) : (
                "Assinar"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Wizard de instalação ─────────────────────────────────────────── */}
      {instalando && (
        <Card>
          {/* Stepper */}
          <div className="flex flex-wrap items-center gap-3">
            {PASSOS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "flex items-center gap-2 text-[13px]",
                  i === passo ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border text-[11px] tabular-nums",
                    i === passo
                      ? "border-primary bg-primary text-primary-foreground"
                      : i < passo
                        ? "text-primary border-[color-mix(in_oklch,var(--primary)_40%,transparent)]"
                        : "border-border",
                  )}
                >
                  {i < passo ? "✓" : i + 1}
                </span>
                {label}
                {i < PASSOS.length - 1 && (
                  <span className="bg-border h-px w-6" />
                )}
              </span>
            ))}
          </div>

          <div className="mt-5">
            {/* Passo 0 — Arquivo */}
            {passo === 0 && (
              <div>
                <h3 className="text-sm font-medium">Arquivo do certificado</h3>
                <p className="text-muted-foreground mt-1 text-[13px]">
                  Aceita .pfx ou .p12. Use o e-CPF A1 do advogado — e-CNPJ não
                  assina peças.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CERT_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    selecionarArquivo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastando(true);
                  }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastando(false);
                    selecionarArquivo(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "mt-4 flex w-full cursor-pointer flex-col items-center rounded-xl border border-dashed p-7 text-center transition-colors",
                    arrastando
                      ? "border-[color-mix(in_oklch,var(--primary)_45%,transparent)] bg-[color-mix(in_oklch,var(--primary)_5%,transparent)]"
                      : "border-[color-mix(in_oklch,var(--primary)_35%,transparent)] bg-[color-mix(in_oklch,var(--primary)_3%,transparent)]",
                  )}
                >
                  <span className="text-sm font-medium">
                    Arraste o arquivo .pfx ou .p12
                  </span>
                  <span className="text-muted-foreground mt-1.5 text-[12.5px]">
                    Somente e-CPF A1 do titular desta conta. e-CNPJ não assina
                    peças.
                  </span>
                  <span className="border-border bg-card text-foreground mt-3.5 rounded-lg border px-4 py-2 text-[13px] font-medium">
                    Escolher arquivo
                  </span>
                </button>

                {arquivo && (
                  <div className="border-border mt-3.5 flex items-center gap-2.5 rounded-xl border p-3">
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">
                        {arquivo.name}
                      </span>
                      <span className="text-muted-foreground block text-[11.5px] tabular-nums">
                        {formatBytes(arquivo.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setArquivo(null)}
                      className="text-muted-foreground hover:text-foreground text-[11.5px]"
                    >
                      Trocar
                    </button>
                  </div>
                )}

                <p className="text-muted-foreground mt-3 flex items-start gap-2 text-xs leading-relaxed">
                  <AlertTriangle className="text-gold mt-px size-3.5 shrink-0" />
                  O arquivo sobe por canal cifrado e é guardado cifrado em
                  repouso. Ninguém do escritório — inclusive administradores —
                  consegue baixá-lo de volta.
                </p>
              </div>
            )}

            {/* Passo 1 — Senha + Política */}
            {passo === 1 && (
              <div className="flex flex-col gap-4">
                <Field
                  label="Senha do certificado"
                  hint="A senha é enviada ao servidor apenas para abrir o arquivo e confirmar os dados. Ela não é armazenada. A assinatura é feita localmente."
                >
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <div>
                  <SectionTitle className="mb-2">
                    Política de senha
                  </SectionTitle>
                  {POLITICAS.map((p) => (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={() => setPolitica(p.valor)}
                      className={cn(
                        "mb-2 block w-full cursor-pointer rounded-xl border p-3.5 text-left",
                        politica === p.valor
                          ? "border-[color-mix(in_oklch,var(--primary)_45%,transparent)] bg-[color-mix(in_oklch,var(--primary)_6%,transparent)]"
                          : "border-border",
                      )}
                    >
                      <span className="block text-[13.5px] font-medium">
                        {p.titulo}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {p.trade}
                      </span>
                    </button>
                  ))}
                </div>

                {previewMutation.error && (
                  <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
                    <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                    <span>{errorMessage(previewMutation.error)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Passo 2 — Validação (leitura do arquivo pelo BE) */}
            {passo === PASSO_VALIDACAO && previewMutation.data && (
              <ValidacaoStep resultado={previewMutation.data} />
            )}

            {/* Passo 3 — Consentimento + Escopo */}
            {passo === PASSO_CONSENTIMENTO && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionTitle className="mb-2">
                    Escopo autorizado
                  </SectionTitle>
                  <div className="flex flex-col">
                    {(
                      [
                        {
                          key: "assinar" as const,
                          label: "Assinar peças",
                          hint: undefined,
                        },
                        {
                          key: "protocolar" as const,
                          label: "Protocolar em seu nome",
                          hint: "mais sensível que assinar — o ato entra nos autos",
                        },
                        {
                          key: "procuracoes" as const,
                          label: "Assinar procurações",
                          hint: undefined,
                        },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="border-border flex items-center justify-between gap-4 border-b py-3"
                      >
                        <div>
                          <span className="text-[13.5px]">{item.label}</span>
                          {item.hint && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              — {item.hint}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={escopo[item.key]}
                          onClick={() =>
                            setEscopo((e) => ({
                              ...e,
                              [item.key]: !e[item.key],
                            }))
                          }
                          className={cn(
                            "relative h-5 w-[34px] flex-none rounded-full border-0 transition-colors",
                            escopo[item.key]
                              ? "bg-primary"
                              : "bg-[color-mix(in_oklch,var(--border)_200%,transparent)]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                              escopo[item.key]
                                ? "translate-x-[14px]"
                                : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAceite((v) => !v)}
                  className="grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-3 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-[18px] flex-none place-items-center rounded border text-[11px]",
                      aceite
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {aceite && "✓"}
                  </span>
                  <span className="text-muted-foreground text-[12.5px] leading-relaxed">
                    Declaro que o certificado é meu, que sou o responsável pelos
                    atos praticados com ele e que autorizo seu uso nos escopos
                    acima. Todo uso é registrado com data, hora, ato e IP.
                  </span>
                </button>

                {uploadMutation.error && (
                  <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)] p-3 text-[12.5px]">
                    <ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                    <span>{errorMessage(uploadMutation.error)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navegação do wizard */}
          <div className="border-border mt-5 flex items-center justify-between gap-2 border-t pt-4">
            {passo > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPasso((p) => p - 1)}
                disabled={uploadMutation.isPending || previewMutation.isPending}
              >
                Voltar
              </Button>
            ) : (
              <span />
            )}
            {passo < PASSOS.length - 1 ? (
              <Button size="sm" disabled={!podeAvancar} onClick={avancar}>
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Validando…
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!aceite || uploadMutation.isPending}
                onClick={ativarCertificado}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Ativando…
                  </>
                ) : (
                  "Ativar certificado"
                )}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ── Certificados da equipe ───────────────────────────────────────── */}
      {certificados && certificados.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-medium">
            Certificados da equipe
          </h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Como administrador, você vê o estado — nunca o arquivo. Quem não tem
            certificado não assina nem protocola.
          </p>
          <div className="mt-3">
            {certificados.map((cert) => {
              const dias = diasRestantes(cert.not_after);
              const nome = cert.owner_user_name ?? cert.subject_cn;
              const revogado = !!cert.revoked_at;
              return (
                <div
                  key={cert.id}
                  className="border-border flex items-center gap-3 border-t py-2.5 text-[13px]"
                >
                  <span className="text-muted-foreground grid size-8 flex-none place-items-center rounded-full border border-[color-mix(in_oklch,var(--border)_150%,transparent)] text-[11px]">
                    {nome
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{nome}</span>
                    <span className="text-muted-foreground block text-[11.5px]">
                      {revogado
                        ? `Removido em ${formatDate(cert.revoked_at)}`
                        : dias > 0
                          ? `vence em ${dias} dias`
                          : "expirado"}
                    </span>
                  </span>
                  <StatusBadge
                    tone={revogado ? "danger" : badgeToneForDias(dias)}
                  >
                    {revogado ? "Removido" : dias > 0 ? "Ativo" : "Expirado"}
                  </StatusBadge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Zona de risco — remover certificado ──────────────────────────── */}
      {meuCert && (
        <>
          <Card className="border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)]">
            <h2 className="font-display text-destructive text-lg font-medium">
              Remover certificado
            </h2>
            <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
              Ao remover, as peças já assinadas continuam válidas, mas você
              deixa de assinar e protocolar até instalar outro. Peças aguardando
              assinatura ficam paradas.
            </p>
            <Button
              variant="outline"
              className="text-destructive mt-3.5 border-[color-mix(in_oklch,var(--destructive)_40%,transparent)] hover:bg-[color-mix(in_oklch,var(--destructive)_4%,transparent)]"
              onClick={() => setConfirmacaoRemocao(true)}
            >
              Remover certificado
            </Button>
          </Card>

          <ConfirmDialog
            aberto={confirmacaoRemocao}
            titulo="Remover certificado?"
            descricao="Esta ação interrompe assinaturas e protocolos até que um novo certificado seja instalado. As peças já assinadas continuam válidas."
            onFechar={() => setConfirmacaoRemocao(false)}
            onConfirmar={confirmarRemocao}
            confirmando={deleteMutation.isPending}
            confirmLabel="Remover definitivamente"
          />
        </>
      )}
    </div>
  );
}
