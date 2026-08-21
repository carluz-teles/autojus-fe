"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Avatar } from "@/components/mock-ui/data-display";
import { StatusBadge } from "@/components/mock-ui/status-badge";
import {
  useIntimacao,
  usePeca,
  useUpdatePecaStatus,
} from "@/features/shared/hooks";
import {
  corDaUrgencia,
  diasRestantes,
  rotuloPrazo,
  urgenciaDe,
} from "@/features/shared/prazo";
import { cn, formatarData } from "@/lib/utils";

import { AssistentePanel, SUGESTOES } from "./assistente-panel";
import { EditorToolbar } from "./editor-toolbar";
import { type PassoPeca, StepperPeca } from "./stepper-peca";

export function PecaWorkspace({ id }: { id: string }) {
  const { data: peca, isLoading } = usePeca(id);
  const intimacao = useIntimacao(peca?.intimacaoId ?? "i1");
  const atualizar = useUpdatePecaStatus(id);
  const [passo, setPasso] = useState<PassoPeca>(1);
  const [foco, setFoco] = useState<string | null>(null);

  if (isLoading || !peca || !intimacao.data) {
    return <div className="p-8">Carregando…</div>;
  }

  const i = intimacao.data;
  const p = i.processoRef;
  const termo = i.prazo?.termoFinal ?? null;
  const dias = termo ? diasRestantes(termo) : null;
  const corPrazo = corDaUrgencia(urgenciaDe(dias));

  return (
    <div className="flex h-full min-h-0 min-w-[1230px] flex-col overflow-x-auto">
      <div className="border-border flex items-center gap-6 border-b px-8 py-4">
        <Link
          href={`/intimacoes/${i.id}`}
          className="text-muted-foreground text-xs no-underline hover:no-underline"
        >
          ← Intimação
        </Link>
        <StepperPeca atual={passo} onIr={setPasso} />
        <div className="ml-auto flex gap-2">
          {passo === 1 && (
            <Button onClick={() => setPasso(2)}>Enviar para assinatura</Button>
          )}
        </div>
      </div>

      {passo === 1 && (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(560px,1fr)_330px]">
          {/* Contexto: intimação, teor, processo, partes, prazo, providências */}
          <aside className="border-border overflow-y-auto border-r px-4 py-6">
            <p className="text-muted-foreground text-[10.5px] tracking-[0.12em] uppercase">
              Contexto
            </p>
            <h3 className="font-display mt-2 text-[19px] font-medium">
              {peca.tipo} {peca.versao}
            </h3>
            <p className="text-muted-foreground text-[11.5px] tabular-nums">
              {p.numero}
            </p>

            <Rotulo className="mt-4">Intimação de origem</Rotulo>
            <Link
              href={`/intimacoes/${i.id}`}
              className="block no-underline hover:no-underline"
            >
              <span className="text-primary inline-flex items-center gap-1.5 text-[13px] font-medium">
                {i.titulo}
                <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11.5px]">
                {i.tipo} · publicada em {formatarData(i.publicacao)}
              </span>
            </Link>

            <Rotulo className="mt-3.5">Teor da publicação</Rotulo>
            <p className="border-border text-muted-foreground max-h-33 overflow-y-auto border-l-2 pl-2.5 text-[11.5px] leading-relaxed">
              {i.teor}
            </p>

            <Rotulo className="mt-6">Processo</Rotulo>
            <Link
              href={`/processos/${encodeURIComponent(p.numero)}`}
              className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] tabular-nums"
            >
              {p.numero}
              <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
            </Link>
            <Campo rotulo="Classe" valor={p.classe} />
            <Campo rotulo="Assunto" valor={p.assunto} />
            <Campo rotulo="Órgão" valor={p.orgao} />
            <Campo
              rotulo="Tribunal · grau"
              valor={`${p.tribunal} · ${p.grau}`}
            />
            <Campo rotulo="Valor da causa" valor={p.valorCausa} />

            <Rotulo className="mt-6">Partes</Rotulo>
            <CampoEmpilhado rotulo="Autor" valor={p.autor} />
            <CampoEmpilhado rotulo="Réu" valor={p.reu} />
            <div className="py-1.5 text-xs">
              <p className="text-muted-foreground text-[11px]">Procuradores</p>
              {p.procuradores.map((proc) => (
                <p key={proc}>{proc}</p>
              ))}
            </div>

            <Rotulo className="mt-6">Prazo</Rotulo>
            <p
              className="font-display text-xl tabular-nums"
              style={{ color: corPrazo }}
            >
              {termo ? formatarData(termo) : "—"}
            </p>
            <p className="text-muted-foreground text-[11.5px]">
              {rotuloPrazo(dias)} · dias úteis
            </p>

            <Rotulo className="mt-6">Providências</Rotulo>
            {i.providencias.map((t) => (
              <div key={t.id} className="py-1 text-[12.5px]">
                <span
                  className={cn(
                    t.status === "Concluída" &&
                      "text-muted-foreground line-through",
                  )}
                >
                  {t.titulo}
                </span>
                <Link
                  href={`/tarefas/${t.id}`}
                  className="mt-0.5 flex items-center gap-1 font-mono text-[10.5px]"
                >
                  {t.codigo} · {t.status}
                  <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
                </Link>
              </div>
            ))}

            <Rotulo className="mt-6">Anexos</Rotulo>
            <div className="flex flex-col gap-2">
              {[
                "Nota promissória.pdf · 412 KB",
                "Contrato 2024.pdf · 1,2 MB",
              ].map((a) => (
                <div
                  key={a}
                  className="border-border truncate rounded-lg border px-2 py-1.5 text-xs"
                >
                  {a}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="justify-center">
                + Anexar documento
              </Button>
            </div>
          </aside>

          {/* Papel: marcadores de sugestão vivem na MARGEM, não na coluna de texto */}
          <section className="overflow-y-auto">
            <EditorToolbar />
            <div className="px-8 pt-7 pb-8">
              <div className="border-border bg-card mx-auto max-w-180 rounded-lg border px-[clamp(24px,5vw,56px)] py-8 shadow-sm">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="text-[14.5px] leading-[1.85] outline-none"
                >
                  <p className="mb-6 uppercase">
                    Excelentíssimo Senhor Doutor Juiz de Direito da Vara do
                    Juizado Especial Cível da Comarca de Franca/SP
                  </p>
                  <p className="mb-4 tabular-nums">
                    Processo nº {p.numero} — {p.classe} — {p.assunto}
                  </p>

                  <ParagrafoMarcado
                    sugestao={SUGESTOES[0]}
                    foco={foco}
                    onFocar={setFoco}
                  >
                    PROLHETI &amp; MARCONDES FORMATURAS LTDA ME, já qualificada
                    nos autos em epígrafe, por seu advogado abaixo assinado, vem
                    respeitosamente à presença de Vossa Excelência, com
                    fundamento no art. 919, caput, do Código de Processo Civil,
                    apresentar DEFESA pelos fatos e fundamentos a seguir
                    expostos.
                  </ParagrafoMarcado>

                  <p className="font-display mb-2 text-[17px]">I — Dos fatos</p>
                  <p className="mb-4">
                    1. O presente feito trata-se de execução de título
                    extrajudicial embasada em nota promissória, conforme se
                    depreende da inicial.
                  </p>
                  <p className="mb-4">
                    2. Todavia, é imprescindível esclarecer que a referida nota
                    promissória não demonstra a existência de vínculo contratual
                    que legitime a pretensão executiva.
                  </p>

                  <p className="font-display mb-2 text-[17px]">
                    II — Do direito
                  </p>
                  <ParagrafoMarcado
                    sugestao={SUGESTOES[1]}
                    foco={foco}
                    onFocar={setFoco}
                  >
                    3. Nos termos dos arts. 917 e 919 do CPC, o executado pode
                    apresentar defesa especificamente contrária e impugnar a
                    existência da obrigação. No presente caso, é evidente que a
                    exequente não cumpriu com seu ônus probatório.
                  </ParagrafoMarcado>

                  <p className="font-display mb-2 text-[17px]">
                    III — Dos pedidos
                  </p>
                  <ParagrafoMarcado
                    sugestao={SUGESTOES[2]}
                    foco={foco}
                    onFocar={setFoco}
                  >
                    4. Requer, ao final, o acolhimento da defesa com a extinção
                    da execução, bem como a condenação da exequente nas custas
                    processuais.
                  </ParagrafoMarcado>
                </div>
              </div>
              <div className="text-muted-foreground mx-auto mt-3 flex max-w-180 justify-between text-[11.5px] tabular-nums">
                <span>402 palavras · 2.534 caracteres</span>
                <span>Rascunho salvo há 1 min</span>
              </div>
            </div>
          </section>

          <AssistentePanel foco={foco} onFocar={setFoco} />
        </div>
      )}

      {passo === 2 && (
        <div className="mx-auto w-full max-w-220 px-8 py-8">
          <h1 className="font-display text-[34px] font-normal">Assinatura</h1>
          <p className="text-muted-foreground mt-2 mb-6 text-[13.5px]">
            Confira a peça e colha as assinaturas antes do protocolo.
          </p>

          <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-8">
            <div className="border-border bg-card text-muted-foreground h-82 overflow-hidden border p-4 text-[8px] leading-relaxed shadow-sm">
              <p className="text-foreground mb-2.5 uppercase">
                Excelentíssimo Senhor Doutor Juiz de Direito da Vara do Juizado
                Especial Cível da Comarca de Franca/SP
              </p>
              {[100, 92, 97, 64, 100, 88, 95, 41, 90, 72].map((w, idx) => (
                <div
                  key={idx}
                  className="bg-muted mb-1.5 h-1.5"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>

            <div>
              <p className="text-muted-foreground mb-2 text-[10.5px] tracking-[0.12em] uppercase">
                Signatários
              </p>
              {[
                {
                  nome: i.condutor,
                  oab: "OAB 347019/SP",
                  papel: "autor da peça",
                },
                {
                  nome: i.revisor,
                  oab: "OAB 198988/MG",
                  papel: "sócia responsável",
                },
              ].map((s) => (
                <div
                  key={s.nome}
                  className="border-border flex items-center gap-3 border-t py-3"
                >
                  <Avatar nome={s.nome} size={30} />
                  <span className="flex-1">
                    <span className="block text-sm">{s.nome}</span>
                    <span className="text-muted-foreground block text-[11.5px]">
                      {s.oab} · {s.papel}
                    </span>
                  </span>
                  <StatusBadge
                    tone={peca.status === "Rascunho" ? "neutral" : "success"}
                  >
                    {peca.status === "Rascunho" ? "Aguardando" : "Assinado"}
                  </StatusBadge>
                </div>
              ))}

              <div className="border-foreground mt-6 border-t pt-4">
                {peca.status !== "Rascunho" && (
                  <p className="text-success mb-3 text-[13.5px]">
                    Peça assinada com certificado A1 · 19/08/2026 10:42
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => atualizar.mutate({ status: "Assinada" })}
                    disabled={peca.status !== "Rascunho"}
                  >
                    {peca.status === "Rascunho"
                      ? "Assinar com certificado"
                      : "Assinada"}
                  </Button>
                  <Button variant="outline" onClick={() => setPasso(3)}>
                    Ir para protocolo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {passo === 3 && (
        <div className="mx-auto w-full max-w-190 px-8 py-8">
          {peca.status === "Protocolada" ? (
            <div>
              <p className="text-success text-[10.5px] tracking-[0.12em] uppercase">
                Protocolado
              </p>
              <h1 className="font-display mt-2 mb-4 text-[40px] font-normal">
                Peça protocolada no {p.tribunal}
              </h1>
              <dl className="border-border grid grid-cols-2 gap-4 gap-x-8 border-y py-4">
                <Recibo rotulo="Protocolo" valor={peca.protocolo ?? "—"} />
                <Recibo rotulo="Data e hora" valor="19/08/2026 10:47" />
                <Recibo rotulo="Processo" valor={p.numero} />
                <Recibo rotulo="Peça" valor={`${peca.tipo} ${peca.versao}`} />
              </dl>
              <p className="text-muted-foreground my-6 text-[13.5px] leading-relaxed">
                A intimação foi marcada como cumprida, as providências
                vinculadas foram encerradas e o prazo saiu da agenda da equipe.
              </p>
              <Button asChild>
                <Link
                  href="/intimacoes"
                  className="no-underline hover:no-underline"
                >
                  Voltar para intimações
                </Link>
              </Button>
            </div>
          ) : (
            <div>
              <h1 className="font-display text-[34px] font-normal">
                Protocolo
              </h1>
              <p className="text-muted-foreground mt-2 mb-6 text-[13.5px]">
                Verificações automáticas antes de enviar ao tribunal.
              </p>
              {[
                {
                  label: "Peça assinada por todos os signatários",
                  detalhe: peca.status === "Rascunho" ? "pendente" : "2 de 2",
                  ok: peca.status !== "Rascunho",
                },
                {
                  label: "Anexos convertidos em PDF/A",
                  detalhe: "2 arquivos",
                  ok: true,
                },
                {
                  label: "Custas processuais",
                  detalhe: "isento — Juizado",
                  ok: true,
                },
                {
                  label: "Prazo ainda aberto",
                  detalhe: termo ? `vence ${formatarData(termo)}` : "sem prazo",
                  ok: dias === null || dias >= 0,
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="border-border flex items-center gap-3 border-t py-3"
                >
                  <span
                    className={cn(
                      "text-[13px]",
                      c.ok ? "text-success" : "text-muted-foreground/60",
                    )}
                  >
                    {c.ok ? "✓" : "○"}
                  </span>
                  <span className="flex-1 text-sm">{c.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {c.detalhe}
                  </span>
                </div>
              ))}
              <div className="border-foreground mt-6 flex gap-2 border-t pt-4">
                <Button
                  disabled={peca.status === "Rascunho"}
                  onClick={() =>
                    atualizar.mutate({
                      status: "Protocolada",
                      protocolo: "2026.0819.4471",
                    })
                  }
                >
                  Protocolar agora
                </Button>
                <Button variant="ghost" asChild>
                  <Link
                    href="/pecas"
                    className="no-underline hover:no-underline"
                  >
                    Salvar e sair
                  </Link>
                </Button>
              </div>
              {peca.status === "Rascunho" && (
                <p className="text-muted-foreground mt-3 text-xs">
                  Protocolar exige a peça assinada — volte ao passo 2.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParagrafoMarcado({
  sugestao,
  foco,
  onFocar,
  children,
}: {
  sugestao: (typeof SUGESTOES)[number];
  foco: string | null;
  onFocar: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const ativo = foco === sugestao.id;
  const indice = SUGESTOES.findIndex((s) => s.id === sugestao.id) + 1;

  return (
    <div className="relative mb-4">
      <button
        type="button"
        title={`Sugestão ${indice}`}
        onClick={() => onFocar(ativo ? null : sugestao.id)}
        className="absolute top-1 -left-7 grid size-5 cursor-pointer place-items-center rounded-full border text-[10.5px] font-medium"
        style={{
          borderColor: sugestao.cor,
          background: sugestao.fundo,
          color: sugestao.cor,
        }}
      >
        {indice}
      </button>
      <p
        className="rounded-sm px-0 py-0.5"
        style={{
          background: ativo ? sugestao.fundo : undefined,
          boxShadow: ativo ? `0 0 0 2px ${sugestao.cor}` : undefined,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function Rotulo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mb-1.5 text-[10.5px] tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-border flex justify-between gap-2.5 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

function CampoEmpilhado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-border border-b py-1.5 text-xs">
      <span className="text-muted-foreground block text-[11px]">{rotulo}</span>
      <span className="mt-0.5 block">{valor}</span>
    </div>
  );
}

function Recibo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10.5px] tracking-[0.1em] uppercase">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-[15px] tabular-nums">{valor}</dd>
    </div>
  );
}
