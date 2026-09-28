"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeletons";
import {
  useCourtCatalog,
  useCourtConnections,
  useDeleteCourtConnection,
} from "@/features/configuracoes/hooks/use-court-connections";
import { useTestCourtConnection } from "@/features/configuracoes/hooks/use-test-court-connection";
import {
  connectionForSystem,
  courtSystemName,
  groupCourtCatalog,
} from "@/features/configuracoes/lib/court-catalog";
import type {
  CourtCatalogEntry,
  CourtConnectionView,
} from "@/features/configuracoes/types/court-connection";

import { useCertWizard } from "../../hooks/use-cert-wizard";
import { CertWizard } from "./cert-wizard";
import { ConexaoWizard } from "./conexao-wizard";
import {
  BRAND_GRADIENT,
  HeroBanner,
  StatusPill,
  type Tone,
} from "./config-kit";

// Redesign: a experiência é organizada por TRIBUNAL, não por sistema. O usuário
// nunca escolhe "eproc vs e-SAJ" — é o MESMO certificado A1 + 2FA pra tudo. Duas
// seções: (1) Certificado (a chave única) e (2) um card por tribunal, cujo acesso
// cobre os autos e — quando o tribunal peticiona — também o peticionamento, exibidos
// como dois checks no próprio card. O e-SAJ do TJSP é colapsado no tribunal (o BE o
// autentica por baixo; ver internal/court/catalog.go).

const ATTENTION = [
  "MFA_REQUIRED",
  "MFA_ENROLLMENT_REQUIRED",
  "REAUTH_REQUIRED",
  "CERTIFICATE_REQUIRED",
  "ERROR",
];

// O acesso é por TRIBUNAL. As DUAS capacidades que o card mostra vêm dos sistemas do
// tribunal (eproc + e-SAJ, colapsados sob um botão): SYNC_AUTOS importa os autos;
// PREPARE_FILING habilita o peticionamento. Um só certificado + 2FA cobre ambos.
const hasCap = (e: CourtCatalogEntry, cap: "SYNC_AUTOS" | "PREPARE_FILING") =>
  (e.capabilities ?? []).includes(cap);

type CourtGroup = ReturnType<typeof groupCourtCatalog>[number];

// ---------------------------------------------------------------------------
// 1. Certificado A1 — a chave única.
// ---------------------------------------------------------------------------
function CertificateKey({ hasCert }: { hasCert: boolean }) {
  const w = useCertWizard();
  return (
    <section aria-label="Certificado digital" className="flex flex-col gap-3">
      <HeroBanner
        icon={<ShieldCheck className="size-[18px]" strokeWidth={1.9} />}
        title="Um certificado, tudo destravado"
        tone={hasCert ? "success" : "primary"}
      >
        Seu <strong>certificado A1</strong> é a chave: um só vale para todos os
        tribunais. Ele importa os autos automaticamente e assina o protocolo das
        suas peças. Suas publicações já chegam pelo DJEN só com a OAB — os autos
        completos exigem o certificado.
      </HeroBanner>

      <div className="flex items-center justify-between gap-3">
        <p className="section-label">Certificados</p>
        <button
          onClick={w.abrir}
          style={{ backgroundImage: BRAND_GRADIENT }}
          className="text-primary-foreground inline-flex min-h-9 flex-none items-center gap-[7px] rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium shadow-sm transition-transform duration-200 hover:-translate-y-px pointer-coarse:min-h-11"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />
          Adicionar certificado
        </button>
      </div>

      {w.listaErro ? (
        <p className="text-destructive text-[12.5px]">
          Não foi possível carregar os certificados.
        </p>
      ) : w.listaPendente ? (
        <div className="surface-panel overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="border-line2 flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
            >
              <span className="bg-hover size-[18px] flex-none animate-pulse rounded" />
              <span className="min-w-0 flex-1">
                <span className="bg-hover mb-1.5 block h-3 w-32 animate-pulse rounded" />
                <span className="bg-hover block h-2.5 w-44 animate-pulse rounded" />
              </span>
            </div>
          ))}
        </div>
      ) : w.lista.length === 0 ? (
        <button
          onClick={w.abrir}
          className="border-line hover:border-primary hover:bg-hover group flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-left transition-colors"
        >
          <span
            className="grid size-10 flex-none place-items-center rounded-xl"
            style={{
              background:
                "color-mix(in oklch, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
          >
            <ShieldCheck className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium">
              Adicione seu certificado A1
            </span>
            <span className="text-fg3 block text-[12px]">
              Arquivo .pfx ou .p12. A senha abre o arquivo e não é armazenada.
            </span>
          </span>
          <Plus
            className="text-fg3 group-hover:text-primary size-4 flex-none"
            aria-hidden
          />
        </button>
      ) : (
        <div className="surface-panel reveal-stagger overflow-hidden">
          {w.lista.map((c) => (
            <div
              key={c.id}
              className="border-line2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <ShieldCheck
                className="text-primary size-[18px] flex-none"
                strokeWidth={1.7}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{c.label}</span>
                <span className="text-fg3 block text-[11.5px]">
                  {c.tipo} · {c.validade}
                </span>
              </span>
              <span
                className="flex-none rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                style={{ background: c.statusFundo, color: c.statusCor }}
              >
                {c.status}
              </span>
              <button
                onClick={c.remover}
                disabled={c.removendo}
                className="border-line bg-panel text-fg2 hover:bg-hover flex min-h-9 flex-none items-center rounded-[7px] border px-2.5 py-[5px] text-[11.5px] disabled:opacity-50 pointer-coarse:min-h-11"
              >
                {c.removendo ? "Removendo…" : "Remover"}
              </button>
            </div>
          ))}
        </div>
      )}

      <CertWizard w={w} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. Autos automáticos — um card por tribunal. O acesso cobre autos e, quando o
//    tribunal peticiona, também o peticionamento — mostrados como dois checks.
// ---------------------------------------------------------------------------
function CapCheck({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <CheckCircle2
        className={`size-3.5 flex-none ${active ? "text-[var(--green)]" : "text-fg3"}`}
        aria-hidden
      />
      <span className={active ? "text-foreground" : "text-fg3"}>{label}</span>
    </span>
  );
}

function AutosCard({
  group,
  connections,
  hasCert,
  onConnect,
}: {
  group: CourtGroup;
  connections: CourtConnectionView[];
  hasCert: boolean;
  onConnect: () => void;
}) {
  // O TRIBUNAL é UMA unidade pro usuário — conectado ou não, ponto final. eproc
  // vs e-SAJ é encanamento interno, nunca exposto aqui. Só a CONEXÃO PERSISTENTE
  // (eproc) define o estado; e-SAJ é PER_OPERATION (peticionamento pontual com o
  // cert, sem sessão) e `connectionForSystem` já o ignora — incluí-lo no cômputo
  // prendia o tribunal em "parcial" pra sempre. Sem estado "parcial": o card é
  // binário (conectado / não), com Conectando… e Precisa reconectar nos reais.
  const availableSystems = group.systems.filter((e) => e.available);
  const available = availableSystems.length > 0;
  const connectable = availableSystems.filter(
    (e) => e.connection_mode !== "PER_OPERATION",
  );
  const conns = connectable.map((e) => connectionForSystem(e, connections));
  const test = useTestCourtConnection();
  const connected =
    connectable.length > 0 && conns.every((c) => c?.status === "CONNECTED");
  const authenticating = conns.some((c) => c?.status === "AUTHENTICATING");
  const needsAttention =
    !connected &&
    (test.isError ||
      conns.some((c) => c != null && ATTENTION.includes(c.status)));
  const hasFiling = group.systems.some((e) => hasCap(e, "PREPARE_FILING"));
  // "Testar conexão" — re-autentica a conexão eproc (connect = login real no
  // tribunal). Sucesso = conexão verificada agora; reusa o endpoint existente.
  const remove = useDeleteCourtConnection();
  const [removing, setRemoving] = useState<CourtConnectionView | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const removeTriggerRef = useRef<HTMLButtonElement>(null);
  const testConnId = conns.find((c) => c?.status === "CONNECTED")?.id ?? null;
  const listedConnections = connections.filter(
    (connection) => connection.court === group.court,
  );

  const statusLabel = !available
    ? "Em preparação"
    : connected
      ? "Conectado"
      : authenticating
        ? "Conectando…"
        : needsAttention
          ? "Precisa reconectar"
          : "Não conectado";
  const statusTone: Tone = !available
    ? "neutral"
    : connected
      ? "success"
      : needsAttention
        ? "warning"
        : "neutral";

  // Dica curta só quando há algo a fazer; conectado fala pelos checks verdes.
  const hint = !available
    ? "Integração em preparação — em breve."
    : authenticating
      ? "Validando o acesso…"
      : needsAttention
        ? "Reconecte (certificado + 2FA) para retomar."
        : connected
          ? null
          : hasCert
            ? "Conecte uma vez com certificado + 2FA."
            : "Adicione um certificado acima para conectar.";

  const accent = connected
    ? "var(--green)"
    : needsAttention
      ? "var(--gold)"
      : "linear-gradient(180deg, var(--primary), var(--gold))";

  return (
    <section
      ref={cardRef}
      aria-label={`Autos · ${group.court}`}
      className="surface-panel relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden px-4 py-3.5"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
      />
      <span
        className="grid size-9 flex-none place-items-center rounded-xl"
        style={{
          background: `color-mix(in oklch, ${connected ? "var(--green)" : "var(--primary)"} 12%, transparent)`,
          color: connected ? "var(--green)" : "var(--primary)",
        }}
      >
        <Landmark className="size-4" strokeWidth={1.9} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-foreground text-sm font-medium">{group.court}</h3>
          <span className="text-muted-foreground text-xs">{group.name}</span>
          <StatusPill
            label={statusLabel}
            tone={statusTone}
            pulse={authenticating}
          />
        </div>
        {available ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <CapCheck label="Autos automáticos" active={connected} />
            {hasFiling ? (
              <CapCheck label="Peticionamento" active={hasCert} />
            ) : null}
          </div>
        ) : null}
        {hint ? (
          <p className="text-fg3 mt-1.5 text-xs leading-relaxed">{hint}</p>
        ) : null}
      </div>

      {available ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {connected && testConnId ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={test.isPending || authenticating}
                onClick={() => test.mutate(testConnId)}
                aria-label={`Testar conexão do ${group.court}`}
              >
                {test.isPending ? "Testando…" : "Testar conexão"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={connected ? "outline" : "default"}
              disabled={
                authenticating || (!connected && !needsAttention && !hasCert)
              }
              onClick={onConnect}
              className="pointer-coarse:min-h-11"
              aria-label={`${connected ? "Ver conexão do" : "Conectar"} ${group.court}`}
            >
              {connected
                ? "Ver conexão"
                : authenticating
                  ? "Conectando…"
                  : needsAttention
                    ? "Tentar novamente"
                    : "Conectar tribunal"}
            </Button>
          </div>
          {connected ? (
            <p
              role="status"
              className={
                test.isError
                  ? "text-destructive text-[11px]"
                  : "text-fg3 flex items-center gap-1 text-[11px]"
              }
            >
              {test.isPending ? (
                "Verificando o acesso ao tribunal…"
              ) : test.isError ||
                (test.data && test.data.status !== "CONNECTED") ? (
                "Não foi possível verificar. Tente de novo."
              ) : (
                <>
                  <CheckCircle2
                    className="size-3 shrink-0 text-[var(--green)]"
                    aria-hidden
                  />
                  Conexão verificada
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <StatusPill label="Em breve" tone="neutral" />
      )}
      {listedConnections.length > 0 ? (
        <div className="border-line2 flex w-full flex-col gap-2 border-t pt-2.5">
          {listedConnections.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="text-fg3">
                {connection.court} · {courtSystemName(connection.system)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={(event) => {
                  removeTriggerRef.current = event.currentTarget;
                  setRemoving(connection);
                }}
                aria-label={`Remover conexão ${connection.court} · ${courtSystemName(connection.system)}`}
              >
                Remover conexão
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <Dialog.Root
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) {
            setRemoving(null);
            remove.reset();
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/30" />
          <Dialog.Popup
            finalFocus={() =>
              removeTriggerRef.current?.isConnected
                ? removeTriggerRef.current
                : cardRef.current?.querySelector("button")
            }
            className="surface-panel fixed top-1/2 left-1/2 z-40 max-h-[90dvh] w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5"
          >
            <Dialog.Title className="text-base font-medium">
              Remover conexão {removing?.court} ·{" "}
              {removing && courtSystemName(removing.system)}?
            </Dialog.Title>
            <Dialog.Description className="text-fg3 mt-2 text-sm leading-relaxed">
              Os processos e documentos já importados e o certificado serão
              mantidos.
            </Dialog.Description>
            {remove.isError ? (
              <p role="alert" className="text-destructive mt-3 text-sm">
                Não foi possível remover a conexão. Tente novamente.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={remove.isPending}
                onClick={() => {
                  setRemoving(null);
                  remove.reset();
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (!removing) return;
                  remove.mutate(removing.id, {
                    onSuccess: () => setRemoving(null),
                  });
                }}
              >
                {remove.isPending ? "Removendo…" : "Remover conexão"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Composição.
// ---------------------------------------------------------------------------
export function ConfigTribunais() {
  const catalog = useCourtCatalog();
  const connections = useCourtConnections();
  const certs = useCertWizard();
  const [selected, setSelected] = useState<CourtGroup | null>(null);

  // Um card por TRIBUNAL — os sistemas (eproc + e-SAJ) ficam colapsados por baixo,
  // conectados juntos pelo wizard unificado.
  const groups = groupCourtCatalog(catalog.data?.data ?? []);
  const hasCert = certs.lista.some(
    (c) => c.status === "Ativo" || c.status === "Expira em breve",
  );

  const loading = catalog.isPending || connections.isPending;
  const failed = catalog.isError || connections.isError;

  return (
    <div className="flex flex-col gap-6">
      <CertificateKey hasCert={hasCert} />

      <section aria-label="Autos automáticos" className="flex flex-col gap-3">
        <div>
          <p className="section-label">Autos automáticos</p>
          <p className="text-fg3 mt-1 text-[12.5px] leading-[1.5]">
            Conecte o tribunal uma vez (certificado + 2FA) e os autos dos seus
            processos passam a chegar sozinhos.
          </p>
        </div>

        {failed ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertTitle>Não foi possível carregar os tribunais</AlertTitle>
            <AlertDescription>
              <Button
                variant="outline"
                size="sm"
                disabled={catalog.isFetching || connections.isFetching}
                onClick={() => {
                  void catalog.refetch();
                  void connections.refetch();
                }}
                className="pointer-coarse:min-h-11"
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <SkeletonRows rows={3} />
        ) : groups.length === 0 ? (
          <p className="surface-panel text-fg3 px-4 py-8 text-center text-[12.5px]">
            Nenhum tribunal disponível para importação automática ainda.
          </p>
        ) : (
          <div className="reveal-stagger flex flex-col gap-2.5">
            {groups.map((group) => (
              <AutosCard
                key={group.court}
                group={group}
                connections={connections.data ?? []}
                hasCert={hasCert}
                onConnect={() => setSelected(group)}
              />
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <ConexaoWizard
          key={selected.court}
          aberto
          court={selected.court}
          courtName={selected.name}
          entries={selected.systems.filter(
            (e) => e.available && e.connection_mode !== "PER_OPERATION",
          )}
          connections={connections.data ?? []}
          onFechar={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
