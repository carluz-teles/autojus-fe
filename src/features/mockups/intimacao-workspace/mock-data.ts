// Matéria-prima estática do mockup "intimação como unidade de trabalho".
// Nenhum dado aqui vem do BE — a tela é uma demonstração navegável do redesign
// da jornada principal (intimação → providência → peça numa tela só).

export type MockProvidencia = {
  id: string;
  titulo: string;
  detalhe: string;
  geraPeca: boolean;
  pecaLabel?: string;
  recomendada?: boolean;
};

export type MockTese = {
  id: string;
  titulo: string;
  fundamento: string;
  fonte?: string;
  confianca: "alta" | "media" | "baixa";
  incluidaPorPadrao: boolean;
};

export type MockSecao = {
  romano: string;
  titulo: string;
  teseId?: string;
  paragrafos: string[];
};

export const INTIMACAO = {
  titulo: "Banco Meridional S.A. — citação para contestar",
  tipoLabel: "Citação",
  fonte: "DJEN",
  publicadaEm: "sexta, 12 de setembro",
  cnj: "1002345-67.2025.8.26.0100",
  orgao: "3ª Vara Cível · Foro Central — São Paulo/SP",
  classe: "Procedimento Comum Cível",
  assunto: "Inexigibilidade de débito · Dano moral",
  autor: "Maria Aparecida dos Santos",
  reu: "Banco Meridional S.A.",
  resumoIA:
    "A autora alega negativação indevida por contrato que afirma não ter celebrado e pede a declaração de inexigibilidade do débito, a exclusão do apontamento e indenização por dano moral de R$ 15.000. O despacho cita o banco para contestar em 15 dias úteis, sob pena de revelia.",
  teor: [
    "Processo nº 1002345-67.2025.8.26.0100 — Procedimento Comum Cível. Autora: Maria Aparecida dos Santos. Réu: Banco Meridional S.A.",
    "Vistos. Cite-se a parte ré, na pessoa de seu representante legal, para que, querendo, apresente contestação no prazo de 15 (quinze) dias úteis, nos termos dos arts. 335 e 344 do Código de Processo Civil, sob pena de revelia e presunção de veracidade das alegações de fato formuladas pela autora.",
    "Defiro a gratuidade da justiça à parte autora. Intime-se.",
  ],
};

const contestar: MockProvidencia = {
  id: "prov-contestar",
  titulo: "Apresentar contestação",
  detalhe:
    "Nega a contratação e afasta o dano moral. Os autos já têm o contrato impugnado e o extrato do Serasa — a defesa se sustenta nos documentos das fls. 34 e 52.",
  geraPeca: true,
  pecaLabel: "Contestação cível",
  recomendada: true,
};

export const PROVIDENCIA_RECOMENDADA = contestar;

export const PROVIDENCIAS: MockProvidencia[] = [
  contestar,
  {
    id: "prov-manifestar",
    titulo: "Impugnar a gratuidade deferida",
    detalhe:
      "Manifestação pontual contra a gratuidade da justiça concedida à autora, antes do mérito.",
    geraPeca: true,
    pecaLabel: "Manifestação",
  },
  {
    id: "prov-cumprir",
    titulo: "Juntar procuração e atos constitutivos",
    detalhe:
      "Regulariza a representação processual do banco — sem peça argumentativa.",
    geraPeca: false,
  },
  {
    id: "prov-ciencia",
    titulo: "Somente registrar ciência",
    detalhe:
      "Nenhuma atuação além do registro. A intimação é resolvida e sai da fila.",
    geraPeca: false,
  },
];

export const TESES: MockTese[] = [
  {
    id: "tese-fraude",
    titulo: "Inexistência de contratação — fraude de terceiro",
    fundamento:
      "A assinatura do contrato de fls. 34 diverge dos documentos pessoais da autora; o débito decorre de fraude praticada por terceiro.",
    fonte: "Contrato bancário — fls. 34-41",
    confianca: "alta",
    incluidaPorPadrao: true,
  },
  {
    id: "tese-culpa-terceiro",
    titulo: "Culpa exclusiva de terceiro — art. 14, §3º, II, do CDC",
    fundamento:
      "A fraude rompe o nexo causal e afasta a responsabilidade objetiva do fornecedor.",
    confianca: "alta",
    incluidaPorPadrao: true,
  },
  {
    id: "tese-sumula-385",
    titulo: "Súmula 385/STJ — negativação preexistente",
    fundamento:
      "A autora registra apontamento anterior legítimo; não cabe indenização por dano moral.",
    fonte: "Extrato Serasa — fls. 52",
    confianca: "alta",
    incluidaPorPadrao: true,
  },
  {
    id: "tese-dano-moral",
    titulo: "Dano moral não configurado — mero dissabor",
    fundamento:
      "Ausente prova de abalo concreto; o apontamento isolado não gera dever de indenizar.",
    confianca: "media",
    incluidaPorPadrao: false,
  },
  {
    id: "tese-litigancia",
    titulo: "Litigância predatória — pedidos genéricos",
    fundamento:
      "Padrão repetitivo de demandas idênticas do mesmo patrono na comarca, sem lastro documental.",
    confianca: "baixa",
    incluidaPorPadrao: false,
  },
];

export const MINUTA: { preambulo: string; secoes: MockSecao[] } = {
  preambulo:
    "Excelentíssimo Senhor Doutor Juiz de Direito da 3ª Vara Cível do Foro Central da Comarca de São Paulo — SP",
  secoes: [
    {
      romano: "I",
      titulo: "Dos fatos",
      paragrafos: [
        "A autora ajuizou a presente demanda alegando desconhecer o contrato de empréstimo que originou o apontamento em seu nome, requerendo a declaração de inexigibilidade do débito e indenização por dano moral.",
        "Contudo, como se demonstrará, a instituição financeira também foi vítima do evento, e os documentos dos autos afastam integralmente a pretensão indenizatória.",
      ],
    },
    {
      romano: "II",
      titulo: "Da inexistência de contratação",
      teseId: "tese-fraude",
      paragrafos: [
        "O contrato acostado às fls. 34-41 ostenta assinatura visivelmente divergente dos documentos pessoais da autora, evidenciando que a avença foi celebrada por terceiro fraudador — fato que o réu não poderia antever mesmo adotando as cautelas usuais.",
      ],
    },
    {
      romano: "III",
      titulo: "Da culpa exclusiva de terceiro",
      teseId: "tese-culpa-terceiro",
      paragrafos: [
        "Nos termos do art. 14, §3º, II, do Código de Defesa do Consumidor, a culpa exclusiva de terceiro rompe o nexo de causalidade e exclui a responsabilidade do fornecedor, na esteira da jurisprudência consolidada do Superior Tribunal de Justiça.",
      ],
    },
    {
      romano: "IV",
      titulo: "Da Súmula 385 do STJ",
      teseId: "tese-sumula-385",
      paragrafos: [
        "O extrato de fls. 52 comprova a existência de negativação anterior e legítima em nome da autora. Incide, portanto, a Súmula 385 do STJ: da anotação irregular em cadastro de proteção ao crédito não cabe indenização por dano moral quando preexistente legítima inscrição.",
      ],
    },
    {
      romano: "V",
      titulo: "Dos pedidos",
      paragrafos: [
        "Ante o exposto, requer o réu que a presente contestação seja recebida, julgando-se improcedentes os pedidos formulados na inicial, com a condenação da autora nos ônus sucumbenciais.",
      ],
    },
  ],
};

export const DOCUMENTOS = [
  { nome: "Petição inicial", fls: "fls. 1-18" },
  { nome: "Procuração da autora", fls: "fls. 19" },
  { nome: "Contrato bancário impugnado", fls: "fls. 34-41" },
  { nome: "Extrato Serasa", fls: "fls. 52" },
];
