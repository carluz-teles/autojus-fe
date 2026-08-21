"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Field, Input, Switch } from "@/components/mock-ui/input";
import { Card, SectionTitle } from "@/components/mock-ui/layout";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import { cn } from "@/lib/utils";

const PASSOS = ["Arquivo", "Senha", "Validação", "Consentimento"] as const;

const POLITICAS = [
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

const VALIDACOES = [
  { label: "Titular confere com a conta", detalhe: "LUAN GOMES · CPF ***.***.891-**", ok: true },
  { label: "OAB entre as monitoradas", detalhe: "347019/SP", ok: true },
  { label: "Cadeia confiável e não revogada", detalhe: "AC Certisign RFB G5", ok: true },
  { label: "Validade", detalhe: "vence em 44 dias — renove antes", ok: false },
  { label: "Tipo do certificado", detalhe: "e-CPF A1 (assina peças)", ok: true },
];

const USOS = [
  { data: "19/08/2026 10:42", ato: "Assinatura de peça", processo: "1017480-70.2020.8.26.0196", ip: "177.32.11.4" },
  { data: "15/08/2026 16:20", ato: "Protocolo", processo: "1021596-17.2023.8.26.0196", ip: "177.32.11.4" },
];

const EQUIPE_CERT = [
  { nome: "Luan Gomes", estado: "Ativo", detalhe: "vence em 44 dias", tom: "warning" as const },
  { nome: "Renata Marcondes", estado: "Ativo", detalhe: "vence em 213 dias", tom: "success" as const },
  { nome: "Ana Martins", estado: "Ausente", detalhe: "não assina nem protocola", tom: "danger" as const },
  { nome: "Paulo Souza", estado: "Ativo", detalhe: "vence em 98 dias", tom: "success" as const },
];

/**
 * Certificado A1 tem aba própria: não é integração, é identidade jurídica.
 * O .pfx + senha permite assinar e protocolar no nome do advogado — vazamento
 * é dano irreversível e vencimento silencioso quebra no dia do prazo.
 */
export function CertificadoTab() {
  const [instalando, setInstalando] = useState(false);
  const [passo, setPasso] = useState(0);
  const [politica, setPolitica] = useState("sessao");
  const [escopo, setEscopo] = useState({
    assinar: true,
    protocolar: true,
    procuracoes: false,
  });
  const [confirmacao, setConfirmacao] = useState("");

  return (
    <div className="mt-7 flex max-w-4xl flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-success" />
            <div>
              <h2 className="font-display text-lg font-medium">
                Seu certificado
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                e-CPF A1 · ICP-Brasil · usado para assinar e protocolar no seu
                nome.
              </p>
            </div>
          </div>
          <StatusBadge tone="warning" ponto>
            Vence em 44 dias
          </StatusBadge>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-8">
          {[
            ["Titular", "LUAN GOMES"],
            ["CPF", "***.***.891-**"],
            ["OAB", "347019/SP"],
            ["Emissor", "AC Certisign RFB G5"],
            ["Validade", "14/03/2027"],
            ["Impressão digital", "9F:2C:11:AE:7D:04"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-3 border-b border-border py-2 text-[13px]"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setInstalando((v) => !v)}>
            {instalando ? "Fechar instalação" : "Substituir certificado"}
          </Button>
        </div>
      </Card>

      {instalando && (
        <Card>
          <div className="flex items-center gap-3">
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
                        ? "border-[color-mix(in_oklch,var(--primary)_40%,transparent)] text-primary"
                        : "border-border",
                  )}
                >
                  {i < passo ? "✓" : i + 1}
                </span>
                {label}
                {i < PASSOS.length - 1 && <span className="h-px w-6 bg-border" />}
              </span>
            ))}
          </div>

          <div className="mt-5">
            {passo === 0 && (
              <div>
                <h3 className="text-sm font-medium">Arquivo do certificado</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Aceita .pfx ou .p12. O e-CNPJ da sociedade não assina peças —
                  use o e-CPF do advogado.
                </p>
                <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    Arraste o arquivo aqui ou clique para selecionar
                  </p>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-px size-3.5 shrink-0 text-gold" />
                  O arquivo é cifrado no envio. Nem administradores conseguem
                  baixá-lo de volta.
                </p>
              </div>
            )}

            {passo === 1 && (
              <div className="flex flex-col gap-4">
                <Field
                  label="Senha do certificado"
                  hint="Usada apenas para abrir o arquivo no momento da assinatura."
                >
                  <Input type="password" placeholder="••••••••" />
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
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {p.trade}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {passo === 2 && (
              <div>
                <h3 className="text-sm font-medium">
                  Validação antes de ativar
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Cinco checagens explícitas — nada é ativado silenciosamente.
                </p>
                <div className="mt-3">
                  {VALIDACOES.map((v) => (
                    <div
                      key={v.label}
                      className="flex items-center gap-3 border-t border-border py-2.5"
                    >
                      <span
                        className={cn(
                          "text-[13px]",
                          v.ok ? "text-success" : "text-gold",
                        )}
                      >
                        {v.ok ? "✓" : "!"}
                      </span>
                      <span className="flex-1 text-[13.5px]">{v.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.detalhe}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {passo === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionTitle className="mb-2">
                    Escopo autorizado
                  </SectionTitle>
                  <div className="flex flex-col gap-3">
                    <Switch
                      label="Assinar peças"
                      checked={escopo.assinar}
                      onCheckedChange={(v) =>
                        setEscopo((e) => ({ ...e, assinar: v }))
                      }
                    />
                    <Switch
                      label="Protocolar em seu nome"
                      hint="mais sensível que assinar — o ato entra nos autos"
                      checked={escopo.protocolar}
                      onCheckedChange={(v) =>
                        setEscopo((e) => ({ ...e, protocolar: v }))
                      }
                    />
                    <Switch
                      label="Assinar procurações"
                      checked={escopo.procuracoes}
                      onCheckedChange={(v) =>
                        setEscopo((e) => ({ ...e, procuracoes: v }))
                      }
                    />
                  </div>
                </div>
                <p className="rounded-xl border border-border bg-muted/50 p-3.5 text-xs leading-relaxed text-muted-foreground">
                  Declaro que sou o titular do certificado e autorizo seu uso
                  nos atos marcados acima. Todo uso é registrado com data, ato,
                  processo e IP.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
            {passo > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPasso((p) => p - 1)}
              >
                Voltar
              </Button>
            ) : (
              <span />
            )}
            {passo < PASSOS.length - 1 ? (
              <Button size="sm" onClick={() => setPasso((p) => p + 1)}>
                Continuar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setInstalando(false);
                  setPasso(0);
                }}
              >
                Ativar certificado
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-lg font-medium">Registro de uso</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Todo ato assinado ou protocolado fica registrado.
        </p>
        <div className="mt-3">
          {USOS.map((u) => (
            <div
              key={u.data}
              className="grid grid-cols-[150px_minmax(0,1fr)_210px_110px] items-center gap-3 border-t border-border py-2.5 text-[13px]"
            >
              <span className="tabular-nums text-muted-foreground">{u.data}</span>
              <span>{u.ato}</span>
              <span className="truncate tabular-nums text-muted-foreground">
                {u.processo}
              </span>
              <span className="tabular-nums text-muted-foreground">{u.ip}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-medium">
          Certificados da equipe
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Administradores veem o estado, nunca o arquivo.
        </p>
        <div className="mt-3">
          {EQUIPE_CERT.map((m) => (
            <div
              key={m.nome}
              className="flex items-center gap-3 border-t border-border py-2.5 text-[13px]"
            >
              <span className="flex-1">{m.nome}</span>
              <span className="text-xs text-muted-foreground">{m.detalhe}</span>
              <StatusBadge tone={m.tom}>{m.estado}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)]">
        <h2 className="font-display text-lg font-medium text-destructive">
          Zona de risco
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Remover o certificado interrompe assinaturas e protocolos em andamento.
          Peças aguardando assinatura ficam bloqueadas até um novo certificado
          ser instalado.
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <Input
            className="w-56"
            placeholder="Digite REMOVER"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
          <Button variant="destructive" disabled={confirmacao !== "REMOVER"}>
            Remover certificado
          </Button>
        </div>
      </Card>
    </div>
  );
}
