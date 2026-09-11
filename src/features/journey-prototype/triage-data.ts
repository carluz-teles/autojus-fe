import { type DemoJourney, demoJourneys } from "./demo-data";

const subjects = [
  [
    "Manifestação sobre documentos",
    "Intime-se a parte para se manifestar sobre os documentos apresentados.",
  ],
  [
    "Juntada de comprovante",
    "Intime-se a parte para juntar comprovante atualizado aos autos.",
  ],
  [
    "Especificação de provas",
    "Especifiquem as partes as provas que pretendem produzir, justificando sua pertinência.",
  ],
  [
    "Regularização da representação",
    "Intime-se a parte para regularizar a representação processual.",
  ],
] as const;
const parties = [
  "Almeida × Horizonte",
  "Oliveira × Aurora",
  "Instituto Solar × Delta",
  "Mendes × Via Norte",
  "Costa × Planalto",
  "Ribeiro × Atlântica",
];
const owners = ["Luan Gomes", "Marina Costa", "Ana Souza"];

/** Volume deterministicamente fictício, exclusivo do mock integrado. */
export function createTriageDemo(): DemoJourney[] {
  return [
    ...demoJourneys,
    ...Array.from({ length: 239 }, (_, index): DemoJourney => {
      const [subject, excerpt] = subjects[index % subjects.length];
      return {
        id: `triage-${index + 1}`,
        title: `${parties[index % parties.length]} · exemplo ${index + 1}`,
        reference: `Processo demonstrativo ${String(index + 7).padStart(3, "0")} · ${index % 2 ? "TJMG" : "TJSP"}`,
        subject,
        excerpt,
        owner: owners[index % owners.length],
        due: index % 3 === 0 ? "A confirmar" : `${10 + (index % 9)} set 2026`,
        publication: `${String(9 - (index % 5)).padStart(2, "0")} set 2026`,
        triage: "Pendente de análise pelo advogado. Dados demonstrativos.",
        works: [],
      };
    }),
  ];
}

export function filterTriage(
  items: DemoJourney[],
  search: string,
  owner: string,
  deadline: string,
) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(search.trim());
  return items.filter(
    (item) =>
      !item.works.length &&
      (!owner || item.owner === owner) &&
      (deadline !== "unconfirmed" || item.due === "A confirmar") &&
      normalize(`${item.title} ${item.reference} ${item.subject}`).includes(
        query,
      ),
  );
}
