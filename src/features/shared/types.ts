export type TarefaStatus =
  "Aberta" | "Em execução" | "Concluída" | "Atrasada" | "Cancelada";

export type TarefaPrioridade = "Alta" | "Média" | "Baixa";

export type TarefaTipo =
  "Providência" | "Diligência" | "Interna" | "Prazo judicial";

export type PrazoEstado = "sugerido" | "confirmado" | "ajustado" | "ausente";
export type Contagem = "uteis" | "corridos";
export type TermoInicial = "disponibilizacao" | "publicacao" | "juntada";

export interface PrazoDerivacao {
  tipo: string;
  termoInicial: TermoInicial;
  termoInicialData: string;
  dias: number;
  contagem: Contagem;
  regra: string;
  emDobro: boolean;
  suspensao: boolean;
  confiancaBaixa: boolean;
}

export interface PrazoAuditoria {
  autor: string;
  quando: string;
  acao: "confirmou" | "ajustou" | "declarou_sem_prazo";
}

export interface Prazo {
  id: string;
  estado: PrazoEstado;
  derivacao: PrazoDerivacao;
  termoFinal: string | null;
  auditoria: PrazoAuditoria | null;
}

export interface Comentario {
  id: string;
  autor: string;
  quando: string;
  texto: string;
}

export interface EventoLog {
  id: string;
  autor: string;
  quando: string;
  evento: string;
  de?: string;
  para?: string;
}

export interface Tarefa {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  tipo: TarefaTipo;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  responsavel: string;
  vencimento: string;
  intimacaoId: string;
  etiquetas: string[];
  comentarios: Comentario[];
  atividade: EventoLog[];
}

export type PecaStatus =
  | "Rascunho"
  | "Revisada"
  | "Assinada"
  | "Aguardando protocolo"
  | "Protocolada"
  | "Descartada";

export interface Peca {
  id: string;
  tipo: string;
  versao: string;
  status: PecaStatus;
  responsavel: string;
  atualizadaEm: string;
  intimacaoId: string;
  protocolo?: string;
}

export type EstagioIntimacao =
  "triagem" | "peca" | "revisao" | "assinatura" | "protocolo";

export interface Intimacao {
  id: string;
  titulo: string;
  tipo: "Intimação" | "Citação" | "Despacho" | "Sentença";
  estagio: EstagioIntimacao;
  processo: string;
  publicacao: string;
  resumo: string;
  teor: string;
  condutor: string;
  revisor: string;
  prazo: Prazo | null;
  historico: { quando: string; descricao: string }[];
}

export type SituacaoProcesso =
  "Em andamento" | "Suspenso" | "Arquivado" | "Baixado";

export interface Processo {
  numero: string;
  classe: string;
  assunto: string;
  orgao: string;
  tribunal: string;
  grau: string;
  situacao: SituacaoProcesso;
  distribuicao: string;
  valorCausa: string;
  autor: string;
  reu: string;
  responsavel: string;
  procuradores: string[];
  resumoIA: string;
  proximosPassos: string[];
  andamentos: { data: string; evento: string; tpu: string }[];
  documentos: { nome: string; meta: string; estado: string }[];
}

export interface Contato {
  id: string;
  nome: string;
  papel: "Cliente" | "Parte contrária";
  celular: string;
  cidade: string;
  processos: number;
  cadastro: string;
}

/** Uma intimação com tudo o que pendura nela — o que a tela de detalhe consome. */
export interface IntimacaoCompleta extends Intimacao {
  processoRef: Processo;
  providencias: Tarefa[];
  pecas: Peca[];
}
