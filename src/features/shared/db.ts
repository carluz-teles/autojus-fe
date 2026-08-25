import type { Contato, Intimacao, Peca, Processo, Tarefa } from "./types";

/**
 * Banco em memória do porte mockado (AtJud). Substituído por API, feature por
 * feature, mantendo as assinaturas dos serviços; as mutações escrevem aqui para
 * que edições propaguem entre telas na sessão.
 */

export const PROCESSOS: Processo[] = [
  {
    numero: "1012473-58.2024.8.26.0196",
    classe: "Execução de título extrajudicial",
    assunto: "Nota promissória",
    orgao: "Juizado Especial Cível de Franca",
    tribunal: "TJSP",
    grau: "1º grau",
    situacao: "Em andamento",
    distribuicao: "2024-03-12",
    valorCausa: "R$ 18.400,00",
    autor: "Prolheti & Marcondes Formaturas Ltda ME",
    reu: "Joel Batista do Nascimento",
    responsavel: "Luan Gomes",
    procuradores: [
      "Luan Gomes · OAB 347019/SP",
      "Paulo Sergio de Oliveira Souza · OAB 321511/SP",
    ],
    resumoIA:
      "Execução de título extrajudicial fundada em nota promissória, movida pelo escritório em nome de Prolheti & Marcondes. O executado foi citado e o juízo abriu prazo de cinco dias úteis para defesa; a peça está em construção.",
    proximosPassos: [
      "Concluir a defesa e colher a revisão da sócia",
      "Anexar contrato e comprovantes que descaracterizam a dívida",
      "Protocolar antes do fim do prazo",
    ],
    andamentos: [
      {
        data: "2026-08-13T02:27:00",
        evento: "Publicação",
        tpu: "TPU 92 · DATAJUD",
      },
      {
        data: "2026-08-12T09:02:00",
        evento: "Remessa",
        tpu: "TPU 123 · DATAJUD",
      },
      {
        data: "2026-08-10T08:10:00",
        evento: "Mero expediente",
        tpu: "TPU 11010 · DATAJUD",
      },
      {
        data: "2026-08-01T05:19:00",
        evento: "Conclusão",
        tpu: "TPU 51 · DATAJUD",
      },
      {
        data: "2024-03-12T10:02:00",
        evento: "Distribuição",
        tpu: "TPU 26 · DATAJUD",
      },
    ],
    documentos: [
      {
        nome: "PROCESSO FASE CITATÓRIA.pdf",
        meta: "71 pág. · 1,7 MB",
        estado: "Pronto",
      },
      {
        nome: "Nota promissória.pdf",
        meta: "2 pág. · 412 KB",
        estado: "Pronto",
      },
      { nome: "Contrato 2024.pdf", meta: "9 pág. · 1,2 MB", estado: "Pronto" },
    ],
  },
  {
    numero: "0000027-11.2022.8.26.0196",
    classe: "Cumprimento de sentença",
    assunto: "Cheque",
    orgao: "01 Cível de Franca",
    tribunal: "TJSP",
    grau: "1º grau",
    situacao: "Em andamento",
    distribuicao: "2022-01-05",
    valorCausa: "—",
    autor: "Joel Batista do Nascimento",
    reu: "Prolheti & Marcondes Formaturas Ltda ME",
    responsavel: "Luan Gomes",
    procuradores: ["Luan Gomes · OAB 347019/SP"],
    resumoIA:
      "Cumprimento de sentença em que o escritório figura no polo passivo. O juízo intimou o exequente a atualizar a memória de cálculo e o prazo venceu sem manifestação.",
    proximosPassos: [
      "Recalcular juros e correção até a data da petição",
      "Peticionar justificativa do atraso",
    ],
    andamentos: [
      {
        data: "2026-08-07T07:40:00",
        evento: "Publicação",
        tpu: "TPU 92 · DATAJUD",
      },
      {
        data: "2026-07-22T10:15:00",
        evento: "Decisão",
        tpu: "TPU 3 · DATAJUD",
      },
    ],
    documentos: [
      {
        nome: "Memória de cálculo.pdf",
        meta: "4 pág. · 208 KB",
        estado: "Pronto",
      },
    ],
  },
  {
    numero: "1017480-70.2020.8.26.0196",
    classe: "Procedimento comum cível",
    assunto: "Prestação de serviços",
    orgao: "02 Cível de Franca",
    tribunal: "TJSP",
    grau: "1º grau",
    situacao: "Em andamento",
    distribuicao: "2020-11-03",
    valorCausa: "R$ 42.000,00",
    autor: "Prolheti & Marcondes Formaturas Ltda ME",
    reu: "A. C. de Oliveira Plastificação",
    responsavel: "Paulo Souza",
    procuradores: ["Paulo Sergio de Oliveira Souza · OAB 321511/SP"],
    resumoIA:
      "O processo migrou para o sistema Eproc e exige credenciamento dos procuradores em cinco dias úteis.",
    proximosPassos: [
      "Credenciar as OABs monitoradas no Eproc",
      "Conferir dados cadastrais no sistema",
    ],
    andamentos: [
      {
        data: "2026-08-13T03:11:00",
        evento: "Publicação",
        tpu: "TPU 92 · DATAJUD",
      },
    ],
    documentos: [],
  },
  {
    numero: "0007873-50.2020.8.26.0196",
    classe: "Execução fiscal",
    assunto: "Dívida ativa",
    orgao: "Anexo Fiscal",
    tribunal: "TJSP",
    grau: "1º grau",
    situacao: "Arquivado",
    distribuicao: "2020-07-01",
    valorCausa: "—",
    autor: "Município de Franca",
    reu: "Prolheti & Marcondes Formaturas Ltda ME",
    responsavel: "Ana Martins",
    procuradores: ["Ana Martins · OAB 402118/SP"],
    resumoIA: "Execução fiscal arquivada definitivamente. Nada a cumprir.",
    proximosPassos: [],
    andamentos: [
      {
        data: "2026-08-15T06:00:00",
        evento: "Arquivamento",
        tpu: "TPU 246 · DATAJUD",
      },
    ],
    documentos: [],
  },
];

export const INTIMACOES: Intimacao[] = [
  {
    id: "i9",
    titulo: "Manifestar sobre cálculo de liquidação",
    tipo: "Intimação",
    estagio: "triagem",
    processo: "0000027-11.2022.8.26.0196",
    publicacao: "2026-08-07",
    resumo:
      "O juízo intimou o exequente a apresentar memória de cálculo atualizada do débito no prazo de cinco dias úteis. O prazo venceu sem manifestação nos autos.",
    teor: "Intime-se o exequente para que, no prazo de 5 (cinco) dias, apresente memória de cálculo atualizada do débito, sob pena de extinção. Int. — ADV: LUAN GOMES (OAB 347019/SP)",
    condutor: "Luan Gomes",
    revisor: "Renata Marcondes",
    prazo: {
      id: "pz9",
      estado: "confirmado",
      derivacao: {
        tipo: "Manifestação",
        termoInicial: "publicacao",
        termoInicialData: "2026-08-07",
        dias: 5,
        contagem: "uteis",
        regra: "art. 218, § 1º, CPC",
        emDobro: false,
        suspensao: false,
        confiancaBaixa: false,
      },
      termoFinal: "2026-08-14",
      auditoria: {
        autor: "Luan Gomes",
        quando: "2026-08-08T09:12:00",
        acao: "confirmou",
      },
    },
    historico: [
      { quando: "2026-08-07T06:10:00", descricao: "Capturada do DJEN" },
      { quando: "2026-08-08T09:12:00", descricao: "Prazo confirmado por Luan" },
    ],
  },
  {
    id: "i1",
    titulo: "Apresentar defesa em execução",
    tipo: "Intimação",
    estagio: "peca",
    processo: "1012473-58.2024.8.26.0196",
    publicacao: "2026-08-13",
    resumo:
      "A parte executada foi intimada a apresentar defesa em execução fundada em nota promissória, no prazo de cinco dias úteis, sob pena de prosseguimento dos atos expropriatórios.",
    teor: "Processo 1012473-58.2024.8.26.0196 — Execução de Título Extrajudicial — Nota Promissória — Prolheti & Marcondes Formaturas Ltda Me — Ficam as partes intimadas para apresentar defesa no prazo legal. — ADV: LUAN GOMES (OAB 347019/SP), PAULO SERGIO DE OLIVEIRA SOUZA (OAB 321511/SP)",
    condutor: "Luan Gomes",
    revisor: "Renata Marcondes",
    prazo: {
      id: "pz1",
      estado: "sugerido",
      derivacao: {
        tipo: "Defesa em execução",
        termoInicial: "publicacao",
        termoInicialData: "2026-08-13",
        dias: 5,
        contagem: "uteis",
        regra: "art. 919, caput, CPC",
        emDobro: false,
        suspensao: false,
        confiancaBaixa: false,
      },
      termoFinal: "2026-08-19",
      auditoria: null,
    },
    historico: [
      { quando: "2026-08-15T06:10:00", descricao: "Capturada do DJEN" },
      { quando: "2026-08-15T06:12:00", descricao: "Prazo sugerido pela regra" },
      {
        quando: "2026-08-16T09:55:00",
        descricao: "Providências geradas pela IA",
      },
    ],
  },
  {
    id: "i2",
    titulo: "Credenciar procuradores no Eproc",
    tipo: "Intimação",
    estagio: "triagem",
    processo: "1017480-70.2020.8.26.0196",
    publicacao: "2026-08-13",
    resumo:
      "O processo passará a tramitar no sistema Eproc. Os procuradores devem se credenciar e conferir os dados cadastrais em cinco dias úteis.",
    teor: "Ficam intimados os procuradores para que providenciem o credenciamento no eproc, bem como verifiquem os dados cadastrais constantes do referido sistema.",
    condutor: "Paulo Souza",
    revisor: "Renata Marcondes",
    prazo: {
      id: "pz2",
      estado: "sugerido",
      derivacao: {
        tipo: "Cumprimento de despacho",
        termoInicial: "publicacao",
        termoInicialData: "2026-08-13",
        dias: 5,
        contagem: "uteis",
        regra: "art. 218, § 3º, CPC",
        emDobro: false,
        suspensao: false,
        confiancaBaixa: true,
      },
      termoFinal: "2026-08-21",
      auditoria: null,
    },
    historico: [
      { quando: "2026-08-15T06:10:00", descricao: "Capturada do DJEN" },
      {
        quando: "2026-08-15T06:12:00",
        descricao: "Prazo sugerido com confiança baixa",
      },
    ],
  },
  {
    id: "i6",
    titulo: "Ciência de arquivamento",
    tipo: "Intimação",
    estagio: "triagem",
    processo: "0007873-50.2020.8.26.0196",
    publicacao: "2026-08-15",
    resumo:
      "Mera ciência do arquivamento definitivo dos autos. A regra não encontrou prazo a cumprir.",
    teor: "Arquivem-se os autos, com as cautelas de praxe.",
    condutor: "Ana Martins",
    revisor: "Renata Marcondes",
    prazo: null,
    historico: [
      { quando: "2026-08-15T06:10:00", descricao: "Capturada do DJEN" },
      { quando: "2026-08-15T06:11:00", descricao: "Nenhum prazo identificado" },
    ],
  },
];

export const TAREFAS: Tarefa[] = [
  {
    id: "t1",
    codigo: "TAR-001",
    titulo: "Atualizar memória de cálculo",
    descricao: "Recalcular juros e correção até a data da petição.",
    tipo: "Providência",
    status: "Atrasada",
    prioridade: "Alta",
    responsavel: "Luan Gomes",
    vencimento: "2026-08-14",
    intimacaoId: "i9",
    etiquetas: ["Cumprimento de sentença", "TJSP", "Urgente"],
    comentarios: [
      {
        id: "c1",
        autor: "Renata Marcondes",
        quando: "2026-08-18T18:12:00",
        texto:
          "Confirmei o prazo com a secretaria. Podemos protocolar no mesmo dia.",
      },
    ],
    atividade: [
      {
        id: "a1",
        autor: "Sistema",
        quando: "2026-08-08T09:55:00",
        evento: "criou a tarefa a partir da intimação",
      },
      {
        id: "a2",
        autor: "Luan Gomes",
        quando: "2026-08-15T10:02:00",
        evento: "alterou o status",
        de: "Aberta",
        para: "Atrasada",
      },
    ],
  },
  {
    id: "t3",
    codigo: "TAR-003",
    titulo: "Redigir defesa (art. 919, CPC)",
    descricao:
      "Impugnar a higidez do título e a ausência de vínculo contratual, com fundamento no art. 917, VI do CPC.",
    tipo: "Providência",
    status: "Em execução",
    prioridade: "Alta",
    responsavel: "Luan Gomes",
    vencimento: "2026-08-19",
    intimacaoId: "i1",
    etiquetas: ["Execução de título extrajudicial", "TJSP", "Urgente"],
    comentarios: [
      {
        id: "c2",
        autor: "Renata Marcondes",
        quando: "2026-08-18T18:12:00",
        texto: "Reforce a ausência de causa debendi antes do pedido.",
      },
    ],
    atividade: [
      {
        id: "a3",
        autor: "Sistema",
        quando: "2026-08-16T09:55:00",
        evento: "criou a tarefa a partir da intimação",
      },
      {
        id: "a4",
        autor: "Luan Gomes",
        quando: "2026-08-18T08:30:00",
        evento: "alterou o status",
        de: "Aberta",
        para: "Em execução",
      },
    ],
  },
  {
    id: "t4",
    codigo: "TAR-004",
    titulo: "Juntar contrato e comprovantes",
    descricao: "Anexar documentos que descaracterizam a dívida.",
    tipo: "Diligência",
    status: "Aberta",
    prioridade: "Média",
    responsavel: "Ana Martins",
    vencimento: "2026-08-18",
    intimacaoId: "i1",
    etiquetas: ["Execução de título extrajudicial"],
    comentarios: [],
    atividade: [
      {
        id: "a5",
        autor: "Sistema",
        quando: "2026-08-16T09:55:00",
        evento: "criou a tarefa a partir da intimação",
      },
    ],
  },
  {
    id: "t5",
    codigo: "TAR-005",
    titulo: "Revisão do sócio",
    descricao: "Revisar a defesa antes de enviar para assinatura.",
    tipo: "Interna",
    status: "Aberta",
    prioridade: "Média",
    responsavel: "Renata Marcondes",
    vencimento: "2026-08-19",
    intimacaoId: "i1",
    etiquetas: ["Revisão"],
    comentarios: [],
    atividade: [
      {
        id: "a6",
        autor: "Sistema",
        quando: "2026-08-16T09:55:00",
        evento: "criou a tarefa a partir da intimação",
      },
    ],
  },
  {
    id: "t6",
    codigo: "TAR-006",
    titulo: "Credenciar no Eproc",
    descricao: "Habilitar as OABs monitoradas no sistema do tribunal.",
    tipo: "Diligência",
    status: "Aberta",
    prioridade: "Média",
    responsavel: "Paulo Souza",
    vencimento: "2026-08-21",
    intimacaoId: "i2",
    etiquetas: ["Eproc"],
    comentarios: [],
    atividade: [
      {
        id: "a7",
        autor: "Sistema",
        quando: "2026-08-15T09:55:00",
        evento: "criou a tarefa a partir da intimação",
      },
    ],
  },
  {
    id: "t7",
    codigo: "TAR-007",
    titulo: "Conferir dados cadastrais",
    descricao: "Regularizar inconsistências de cadastro no Eproc.",
    tipo: "Diligência",
    status: "Concluída",
    prioridade: "Baixa",
    responsavel: "Paulo Souza",
    vencimento: "2026-08-21",
    intimacaoId: "i2",
    etiquetas: ["Eproc"],
    comentarios: [],
    atividade: [
      {
        id: "a8",
        autor: "Paulo Souza",
        quando: "2026-08-18T14:20:00",
        evento: "alterou o status",
        de: "Aberta",
        para: "Concluída",
      },
    ],
  },
];

export const PECAS: Peca[] = [
  {
    id: "pc1",
    tipo: "Defesa",
    versao: "v3",
    status: "Rascunho",
    responsavel: "Luan Gomes",
    atualizadaEm: "2026-08-19T10:12:00",
    intimacaoId: "i1",
  },
  {
    id: "pc2",
    tipo: "Pedido de dilação",
    versao: "v1",
    status: "Descartada",
    responsavel: "Ana Martins",
    atualizadaEm: "2026-08-15T09:30:00",
    intimacaoId: "i1",
  },
  {
    id: "pc3",
    tipo: "Manifestação sobre cálculo",
    versao: "v2",
    status: "Revisada",
    responsavel: "Luan Gomes",
    atualizadaEm: "2026-08-18T17:40:00",
    intimacaoId: "i9",
  },
  {
    id: "pc4",
    tipo: "Petição de juntada",
    versao: "v1",
    status: "Protocolada",
    responsavel: "Paulo Souza",
    atualizadaEm: "2026-08-15T16:20:00",
    intimacaoId: "i2",
    protocolo: "2026.0815.3391",
  },
];

export const CONTATOS: Contato[] = [
  {
    id: "ct1",
    nome: "Prolheti & Marcondes Formaturas Ltda ME",
    papel: "Cliente",
    celular: "(16) 99364-9635",
    cidade: "Franca",
    processos: 12,
    cadastro: "2022-03-23",
  },
  {
    id: "ct2",
    nome: "A. C. de Oliveira Plastificação",
    papel: "Cliente",
    celular: "(16) 99364-9635",
    cidade: "Franca",
    processos: 4,
    cadastro: "2022-03-23",
  },
  {
    id: "ct3",
    nome: "Felipe Lopes de Oliveira",
    papel: "Parte contrária",
    celular: "—",
    cidade: "Franca",
    processos: 1,
    cadastro: "2022-03-23",
  },
  {
    id: "ct4",
    nome: "Joel Batista do Nascimento",
    papel: "Parte contrária",
    celular: "(16) 98811-2044",
    cidade: "Ribeirão Preto",
    processos: 2,
    cadastro: "2022-01-05",
  },
];

export const EQUIPE = [
  "Luan Gomes",
  "Ana Martins",
  "Paulo Souza",
  "Renata Marcondes",
] as const;

export const USUARIO_ATUAL = "Luan Gomes";

/** Data ISO "YYYY-MM-DD" do dia CORRENTE no fuso local do navegador.
 *  Timezone-safe: usa componentes locais (getFullYear/getMonth/getDate) em
 *  vez de toISOString(), que retornaria a data UTC — em BR (UTC-3) isso
 *  pode voltar o dia anterior perto da meia-noite.
 *
 *  Antes era `const HOJE = "2026-08-19"` (herança de mock, época em que os
 *  consumidores desta constante eram só telas com dados fake). Como agora
 *  Partida/PecaContexto/etc lêem dados reais do BE, congelar a data
 *  quebrava o cálculo de dias restantes ("em 5 dias" quando o BE já
 *  reportava "1 dia em atraso"). */
export function hojeISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
