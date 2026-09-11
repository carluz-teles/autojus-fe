/** Fictional, read-only scenarios. These are UX concepts, not domain states. */
export type Stage =
  "received" | "analysis" | "work" | "writing" | "review" | "filing" | "done";
export type JourneyEvent = {
  title: string;
  actor: string;
  at: string;
  detail: string;
};
export type DemoWork = {
  id: string;
  title: string;
  owner: string;
  stage: Stage;
  status: string;
  next: string;
  explanation: string;
  piece?: {
    title: string;
    version: number;
    author: string;
    generatedAt: string;
    editedAt: string;
    reviewer: string;
  };
  blocker?: string;
  filing?: "draft" | "uncertain" | "confirmed";
  events: JourneyEvent[];
};
export type DemoJourney = {
  id: string;
  title: string;
  reference: string;
  subject: string;
  owner: string;
  due: string;
  publication: string;
  excerpt: string;
  triage: string;
  works: DemoWork[];
};

const reviewPiece = {
  title: "Manifestação sobre documentos",
  version: 3,
  author: "Marina Costa",
  generatedAt: "08 set · 14:32",
  editedAt: "09 set · 09:18",
  reviewer: "Luan Gomes",
};

export const demoJourneys: DemoJourney[] = [
  {
    id: "review",
    title: "Helena Duarte × Aurora Seguros",
    reference: "Processo demonstrativo 001 · TJSP",
    subject: "Manifestação sobre documentos",
    owner: "Luan Gomes",
    due: "14 set 2026",
    publication: "08 set 2026",
    excerpt:
      "Intime-se a parte autora para se manifestar sobre os documentos juntados pela parte ré.",
    triage:
      "Analisada por Luan Gomes em 08 set · 10:24. Duas providências criadas; o trabalho continua aqui.",
    works: [
      {
        id: "manifestation",
        title: "Elaborar manifestação",
        owner: "Luan Gomes",
        stage: "review",
        status: "Aguardando revisão",
        next: "Revisar peça",
        explanation:
          "Marina concluiu a elaboração. Agora Luan precisa revisar o conteúdo e os fundamentos antes da preparação do protocolo.",
        piece: reviewPiece,
        events: [
          {
            title: "Peça enviada para revisão",
            actor: "Marina Costa → Luan Gomes",
            at: "09 set · 09:20",
            detail: "Versão 3 · aguardando revisão do advogado.",
          },
          {
            title: "Versão 3 salva",
            actor: "Marina Costa",
            at: "09 set · 09:18",
            detail: "Ajustes nos pedidos e nas referências aos autos.",
          },
          {
            title: "Primeira minuta gerada",
            actor: "IA · solicitada por Marina Costa",
            at: "08 set · 14:32",
            detail: "Vinculada a esta providência e à intimação de origem.",
          },
          {
            title: "Providência criada",
            actor: "Luan Gomes",
            at: "08 set · 10:24",
            detail: "Elaboração atribuída a Marina Costa.",
          },
        ],
      },
      {
        id: "documents",
        title: "Obter comprovante atualizado",
        owner: "Marina Costa",
        stage: "work",
        status: "Aguardando documento",
        next: "Ver pendência",
        explanation:
          "O comprovante foi solicitado à cliente. Esta providência segue em paralelo à revisão da peça.",
        blocker:
          "Falta o comprovante atualizado. A juntada deve ser conferida antes do envio da manifestação.",
        events: [
          {
            title: "Documento solicitado à cliente",
            actor: "Marina Costa",
            at: "08 set · 11:05",
            detail:
              "Aguardando retorno. Nenhum documento recebido neste exemplo.",
          },
          {
            title: "Providência criada",
            actor: "Luan Gomes",
            at: "08 set · 10:24",
            detail: "Responsável: Marina Costa. Não gera peça própria.",
          },
        ],
      },
    ],
  },
  {
    id: "analysis",
    title: "Instituto Horizonte × Delta Serviços",
    reference: "Processo demonstrativo 002 · TJMG",
    subject: "Intimação para manifestação",
    owner: "Marina Costa",
    due: "A confirmar",
    publication: "09 set 2026",
    excerpt:
      "Intimem-se as partes para manifestação sobre o documento apresentado.",
    triage:
      "Ainda na triagem. A análise e o prazo precisam ser revisados; nenhuma providência foi criada.",
    works: [],
  },
  {
    id: "draft",
    title: "Clara Mendes × Vale Comércio",
    reference: "Processo demonstrativo 003 · TJSP",
    subject: "Manifestação sobre documentos",
    owner: "Luan Gomes",
    due: "15 set 2026",
    publication: "08 set 2026",
    excerpt: "Manifeste-se a parte autora sobre a documentação apresentada.",
    triage:
      "Analisada por Luan Gomes em 08 set · 09:10. Uma providência criada.",
    works: [
      {
        id: "portal-draft",
        title: "Apresentar manifestação",
        owner: "Luan Gomes",
        stage: "filing",
        status: "Rascunho no portal",
        next: "Ver preparação",
        explanation:
          "A peça foi revisada e o rascunho foi preparado no portal. Não houve protocolo: falta a conferência e o envio pelo advogado.",
        filing: "draft",
        piece: {
          ...reviewPiece,
          version: 2,
          generatedAt: "08 set · 10:02",
          editedAt: "08 set · 11:30",
        },
        events: [
          {
            title: "Rascunho preparado no portal",
            actor: "Sistema · solicitado por Luan Gomes",
            at: "09 set · 08:40",
            detail: "Modo rascunho. Sem envio e sem recibo de protocolo.",
          },
          {
            title: "Versão 2 revisada",
            actor: "Luan Gomes",
            at: "08 set · 11:35",
            detail: "Liberada para preparação do protocolo.",
          },
          {
            title: "Primeira minuta gerada",
            actor: "IA · solicitada por Marina Costa",
            at: "08 set · 10:02",
            detail: "Peça vinculada à intimação de origem.",
          },
        ],
      },
    ],
  },
  {
    id: "uncertain",
    title: "Rafael Lima × Jardim Empreendimentos",
    reference: "Processo demonstrativo 004 · TJSP",
    subject: "Manifestação sobre documentos",
    owner: "Luan Gomes",
    due: "11 set 2026",
    publication: "04 set 2026",
    excerpt:
      "Intime-se a parte autora para manifestação sobre os documentos juntados.",
    triage:
      "Analisada por Luan Gomes em 04 set · 10:00. Uma providência criada.",
    works: [
      {
        id: "uncertain-filing",
        title: "Apresentar manifestação",
        owner: "Luan Gomes",
        stage: "filing",
        status: "Confirmar recebimento",
        next: "Conferir tentativa",
        explanation:
          "O envio foi iniciado, mas o recebimento ainda não foi confirmado. A jornada permanece aberta.",
        filing: "uncertain",
        blocker:
          "Não repetir o envio antes de conferir o recebimento no tribunal. Um retorno incerto não significa que o protocolo falhou.",
        piece: {
          ...reviewPiece,
          version: 1,
          generatedAt: "04 set · 11:10",
          editedAt: "08 set · 15:00",
        },
        events: [
          {
            title: "Confirmação de recebimento pendente",
            actor: "Sistema",
            at: "09 set · 09:05",
            detail:
              "Sem confirmação conclusiva do tribunal. Novo envio bloqueado.",
          },
          {
            title: "Envio solicitado",
            actor: "Luan Gomes",
            at: "09 set · 09:03",
            detail: "Versão 1 revisada. Tentativa demonstrativa, não real.",
          },
        ],
      },
    ],
  },
  {
    id: "no-piece",
    title: "Beatriz Almeida × Oficina Central",
    reference: "Processo demonstrativo 005 · TJSP",
    subject: "Acompanhamento de decisão",
    owner: "Marina Costa",
    due: "Sem prazo",
    publication: "04 set 2026",
    excerpt:
      "Dê-se conhecimento às partes da decisão disponibilizada nos autos.",
    triage:
      "Analisada por Marina Costa em 04 set · 10:15. Registrado acompanhamento sem necessidade de peça.",
    works: [
      {
        id: "follow-up",
        title: "Comunicar andamento à cliente",
        owner: "Marina Costa",
        stage: "done",
        status: "Concluída sem peça",
        next: "Ver conclusão",
        explanation:
          "Cliente informada e acompanhamento registrado. Esta providência não exige elaboração de peça nem protocolo.",
        events: [
          {
            title: "Providência concluída",
            actor: "Marina Costa",
            at: "04 set · 16:30",
            detail:
              "Cliente comunicada. Conclusão registrada sem peça e sem protocolo.",
          },
          {
            title: "Providência criada",
            actor: "Marina Costa",
            at: "04 set · 10:15",
            detail: "Comunicar o andamento à cliente.",
          },
        ],
      },
    ],
  },
  {
    id: "confirmed",
    title: "Núcleo Solar × Alameda Participações",
    reference: "Processo demonstrativo 006 · TJSP",
    subject: "Manifestação sobre documentos",
    owner: "Luan Gomes",
    due: "Cumprido · 08 set",
    publication: "04 set 2026",
    excerpt: "Manifeste-se a parte autora sobre os documentos apresentados.",
    triage:
      "Analisada por Luan Gomes em 04 set · 10:00. Providência encerrada após confirmação do protocolo.",
    works: [
      {
        id: "confirmed-filing",
        title: "Apresentar manifestação",
        owner: "Luan Gomes",
        stage: "done",
        status: "Protocolo confirmado",
        next: "Ver comprovante",
        explanation:
          "Recebimento confirmado pelo tribunal e comprovante vinculado. A providência foi concluída; o processo continua no acervo.",
        filing: "confirmed",
        piece: {
          ...reviewPiece,
          version: 2,
          generatedAt: "04 set · 14:00",
          editedAt: "08 set · 09:30",
        },
        events: [
          {
            title: "Providência concluída",
            actor: "Luan Gomes",
            at: "08 set · 10:05",
            detail: "Comprovante conferido e vinculado à peça v2.",
          },
          {
            title: "Recebimento confirmado pelo tribunal",
            actor: "Sistema",
            at: "08 set · 10:02",
            detail: "Comprovante demonstrativo DEMO-RECIBO-006.",
          },
          {
            title: "Envio solicitado",
            actor: "Luan Gomes",
            at: "08 set · 10:00",
            detail: "Peça revisada e anexos conferidos. Cenário fictício.",
          },
        ],
      },
    ],
  },
];

export function journeyStatus(journey: DemoJourney) {
  if (!journey.works.length) return "Na triagem";
  if (journey.works.every((work) => work.stage === "done"))
    return journey.works.some((work) => work.piece)
      ? "Concluída · protocolo confirmado"
      : "Concluída sem peça";
  return journey.works[0].status;
}

export function openWorks(journey: DemoJourney) {
  return journey.works.filter((work) => work.stage !== "done").length;
}
