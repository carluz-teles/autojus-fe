import {
  CONTATOS,
  INTIMACOES,
  PECAS,
  PROCESSOS,
  TAREFAS,
  USUARIO_ATUAL,
} from "./db";
import type {
  Contato,
  Intimacao,
  IntimacaoCompleta,
  Peca,
  Prazo,
  Processo,
  Tarefa,
} from "./types";

const espera = <T,>(valor: T, ms = 90) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(valor), ms));

const clone = <T,>(v: T): T => structuredClone(v);

function montarIntimacao(i: Intimacao): IntimacaoCompleta {
  return {
    ...i,
    processoRef: PROCESSOS.find((p) => p.numero === i.processo)!,
    providencias: TAREFAS.filter((t) => t.intimacaoId === i.id),
    pecas: PECAS.filter((p) => p.intimacaoId === i.id),
  };
}

export async function listIntimacoes(): Promise<IntimacaoCompleta[]> {
  return espera(INTIMACOES.map((i) => clone(montarIntimacao(i))));
}

export async function getIntimacao(id: string): Promise<IntimacaoCompleta> {
  const alvo = INTIMACOES.find((i) => i.id === id);
  if (!alvo) throw new Error("Intimacao nao encontrada: " + id);
  return espera(clone(montarIntimacao(alvo)));
}

export async function updatePrazo(
  intimacaoId: string,
  prazo: Prazo,
): Promise<Prazo> {
  const alvo = INTIMACOES.find((i) => i.id === intimacaoId);
  if (alvo) {
    alvo.prazo = prazo;
    const termo = prazo.termoFinal;
    if (termo) {
      TAREFAS.filter((t) => t.intimacaoId === intimacaoId).forEach((t) => {
        t.vencimento = termo;
      });
    }
  }
  return espera(prazo);
}

export async function listTarefas(): Promise<Tarefa[]> {
  return espera(clone(TAREFAS));
}

export async function getTarefa(id: string): Promise<Tarefa> {
  const alvo = TAREFAS.find((t) => t.id === id);
  if (!alvo) throw new Error("Tarefa nao encontrada: " + id);
  return espera(clone(alvo));
}

type PatchTarefa = Partial<
  Pick<Tarefa, "status" | "tipo" | "prioridade" | "responsavel" | "vencimento">
>;

const LABEL_EVENTO: Record<string, string> = {
  status: "alterou o status",
  tipo: "alterou o tipo",
  prioridade: "alterou a prioridade",
  responsavel: "reatribuiu",
  vencimento: "alterou o vencimento",
};

export async function updateTarefa(
  id: string,
  patch: PatchTarefa,
): Promise<Tarefa> {
  const alvo = TAREFAS.find((t) => t.id === id);
  if (!alvo) throw new Error("Tarefa nao encontrada: " + id);

  const chaves = Object.keys(patch) as (keyof PatchTarefa)[];
  chaves.forEach((campo) => {
    const anterior = alvo[campo];
    const novo = patch[campo];
    if (novo === undefined || anterior === novo) return;
    alvo.atividade.unshift({
      id: "a" + Date.now() + campo,
      autor: USUARIO_ATUAL,
      quando: new Date().toISOString(),
      evento: LABEL_EVENTO[campo] || "alterou " + campo,
      de: String(anterior),
      para: String(novo),
    });
  });

  Object.assign(alvo, patch);
  return espera(clone(alvo));
}

export async function addComentario(id: string, texto: string): Promise<Tarefa> {
  const alvo = TAREFAS.find((t) => t.id === id);
  if (!alvo) throw new Error("Tarefa nao encontrada: " + id);
  alvo.comentarios.push({
    id: "c" + Date.now(),
    autor: USUARIO_ATUAL,
    quando: new Date().toISOString(),
    texto,
  });
  return espera(clone(alvo));
}

export async function listProcessos(): Promise<Processo[]> {
  return espera(clone(PROCESSOS));
}

export async function getProcesso(numero: string): Promise<Processo> {
  const alvo = PROCESSOS.find((p) => p.numero === numero);
  if (!alvo) throw new Error("Processo nao encontrado: " + numero);
  return espera(clone(alvo));
}

export async function listPecas(): Promise<Peca[]> {
  return espera(clone(PECAS));
}

export async function getPeca(id: string): Promise<Peca> {
  const alvo = PECAS.find((p) => p.id === id);
  if (!alvo) throw new Error("Peca nao encontrada: " + id);
  return espera(clone(alvo));
}

export async function updatePecaStatus(
  id: string,
  status: Peca["status"],
  protocolo?: string,
): Promise<Peca> {
  const alvo = PECAS.find((p) => p.id === id);
  if (!alvo) throw new Error("Peca nao encontrada: " + id);
  alvo.status = status;
  if (protocolo) alvo.protocolo = protocolo;
  alvo.atualizadaEm = new Date().toISOString();
  return espera(clone(alvo));
}

export async function listContatos(): Promise<Contato[]> {
  return espera(clone(CONTATOS));
}
