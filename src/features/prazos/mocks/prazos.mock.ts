// Banco em memória da experiência Prazos (Inbox + Pipeline), portado do Claude
// Design. Modelo do PROTÓTIPO — origem multi-fonte (declarado/calculado/validado/
// divergente/ia/semprazo) e pipeline de 6 estágios — que ainda NÃO existe no BE.
// Mock-first: as telas ligam a estes dados; a troca por apiFetch acontece página
// por página, mantendo as assinaturas do service. NÃO confundir com o types.ts
// da feature (read models de deadline do BE real).

export type PrazoOrigem =
  "declarado" | "calculado" | "validado" | "divergente" | "ia" | "semprazo";

export type PrazoStage =
  | "intimacao"
  | "confirmar"
  | "confirmado"
  | "elaboracao"
  | "revisao"
  | "protocolado";

export interface PrazoMock {
  id: string;
  providencia: string;
  cliente: string;
  cnj: string;
  resp: string;
  /** Dias úteis até o prazo interno (negativo = em atraso). */
  dias: number;
  /** Prazo interno "dd/09". */
  interna: string;
  /** Prazo fatal "dd/09". */
  fatal: string;
  origem: PrazoOrigem;
  stage: PrazoStage;
  unread: boolean;
  orgao: string;
  /** Trecho/teor da intimação de origem (só nos itens semeados). */
  trecho: string;
  /** Data de publicação "dd/08". */
  publicacao: string;
  /** Nota de triagem (divergência/IA) exibida no peek. */
  nota: string;
}

export const EQUIPE = [
  "Renata Marcondes",
  "Luan Gomes",
  "Ana Martins",
  "Paulo Souza",
  "Camila Ré",
  "Diego Antunes",
] as const;

export const USUARIO_ATUAL = "Renata Marcondes";

/** Data de referência do mock — evita a tela mudar de significado com o tempo. */
export const HOJE = "2026-08-30";

// 13 itens fixos e "curados" — cobrem os casos de triagem (divergência, IA, sem
// prazo) e todos os estágios do pipeline. São a cabeça da lista; o gerador
// completa o volume.
const SEED: PrazoMock[] = [
  {
    id: "i1",
    providencia: "Contestação",
    cliente: "Prolheti Formaturas ME",
    cnj: "1012473-58.2024.8.26.0196",
    resp: "Luan Gomes",
    dias: -1,
    interna: "02/09",
    fatal: "04/09",
    origem: "divergente",
    stage: "confirmar",
    unread: true,
    orgao: "3ª Vara Cível · Guarulhos",
    trecho:
      "Fica a parte ré intimada para, querendo, apresentar contestação no prazo legal, sob pena de revelia.",
    publicacao: "18/08",
    nota: "Fontes divergem: 04/09 (declarado) × 08/09 (calculado). Não sai por atalho — abra para decidir.",
  },
  {
    id: "i2",
    providencia: "Recurso de Apelação",
    cliente: "Construtora Vetor",
    cnj: "2098112-40.2024.8.26.0000",
    resp: "Renata Marcondes",
    dias: 0,
    interna: "03/09",
    fatal: "05/09",
    origem: "ia",
    stage: "confirmar",
    unread: true,
    orgao: "TJSP · 2º grau",
    trecho:
      "Publicada a r. sentença. Intimadas as partes do inteiro teor para os fins de direito.",
    publicacao: "19/08",
    nota: "Tipo inferido por IA (82%): sentença de mérito → apelação. Confirme o tipo antes do prazo.",
  },
  {
    id: "i3",
    providencia: "Manifestação sobre laudo",
    cliente: "Nutrimed Ltda",
    cnj: "1005621-77.2025.8.26.0114",
    resp: "Ana Martins",
    dias: 1,
    interna: "31/08",
    fatal: "02/09",
    origem: "declarado",
    stage: "confirmar",
    unread: true,
    orgao: "1ª Vara Cível · Campinas",
    trecho: "Juntado laudo pericial. Manifestem-se as partes em 15 dias.",
    publicacao: "20/08",
    nota: "",
  },
  {
    id: "i4",
    providencia: "Contrarrazões",
    cliente: "Têxtil Aurora S.A.",
    cnj: "1099233-12.2024.8.26.0100",
    resp: "Luan Gomes",
    dias: 3,
    interna: "02/09",
    fatal: "04/09",
    origem: "calculado",
    stage: "confirmar",
    unread: false,
    orgao: "12ª Vara Cível · Foro Central",
    trecho:
      "Interposto recurso de apelação pela parte adversa. Intime-se para contrarrazões.",
    publicacao: "20/08",
    nota: "",
  },
  {
    id: "i5",
    providencia: "Especificação de provas",
    cliente: "Bianchi Materiais ME",
    cnj: "1007781-63.2025.8.26.0224",
    resp: "Paulo Souza",
    dias: 8,
    interna: "10/09",
    fatal: "12/09",
    origem: "calculado",
    stage: "confirmado",
    unread: false,
    orgao: "2ª Vara Cível · Guarulhos",
    trecho: "Especifiquem as partes as provas que pretendem produzir.",
    publicacao: "22/08",
    nota: "",
  },
  {
    id: "i6",
    providencia: "Réplica",
    cliente: "Lima & Prado",
    cnj: "1023940-88.2025.8.26.0602",
    resp: "Renata Marcondes",
    dias: 5,
    interna: "05/09",
    fatal: "09/09",
    origem: "declarado",
    stage: "confirmado",
    unread: false,
    orgao: "4ª Vara Cível · Sorocaba",
    trecho: "",
    publicacao: "21/08",
    nota: "",
  },
  {
    id: "i7",
    providencia: "Embargos de Declaração",
    cliente: "Município de Barueri",
    cnj: "0007782-19.2025.8.26.0053",
    resp: "Paulo Souza",
    dias: 2,
    interna: "01/09",
    fatal: "01/09",
    origem: "declarado",
    stage: "elaboracao",
    unread: false,
    orgao: "Vara da Fazenda",
    trecho: "",
    publicacao: "22/08",
    nota: "",
  },
  {
    id: "i8",
    providencia: "Impugnação ao cumprimento",
    cliente: "Ativa Log",
    cnj: "1044120-05.2023.8.26.0100",
    resp: "Ana Martins",
    dias: 6,
    interna: "08/09",
    fatal: "10/09",
    origem: "declarado",
    stage: "elaboracao",
    unread: false,
    orgao: "20ª Vara Cível",
    trecho: "",
    publicacao: "21/08",
    nota: "",
  },
  {
    id: "i9",
    providencia: "Alegações finais",
    cliente: "Grupo Selene",
    cnj: "0011234-56.2024.8.26.0011",
    resp: "Luan Gomes",
    dias: 9,
    interna: "11/09",
    fatal: "15/09",
    origem: "declarado",
    stage: "revisao",
    unread: false,
    orgao: "1ª Vara · Pinheiros",
    trecho: "",
    publicacao: "22/08",
    nota: "",
  },
  {
    id: "i10",
    providencia: "Recurso Inominado",
    cliente: "Ferragens União",
    cnj: "1002210-44.2025.8.26.0016",
    resp: "Ana Martins",
    dias: 4,
    interna: "03/09",
    fatal: "05/09",
    origem: "declarado",
    stage: "protocolado",
    unread: false,
    orgao: "Juizado Especial",
    trecho: "",
    publicacao: "20/08",
    nota: "",
  },
  {
    id: "i11",
    providencia: "Agravo de Instrumento",
    cliente: "Construtora Vetor",
    cnj: "2211889-03.2025.8.26.0000",
    resp: "Renata Marcondes",
    dias: 11,
    interna: "15/09",
    fatal: "17/09",
    origem: "ia",
    stage: "intimacao",
    unread: true,
    orgao: "TJSP · 2º grau",
    trecho: "",
    publicacao: "25/08",
    nota: "",
  },
  {
    id: "i12",
    providencia: "Cumprimento de sentença",
    cliente: "Nutrimed Ltda",
    cnj: "1005621-33.2025.8.26.0114",
    resp: "Ana Martins",
    dias: 14,
    interna: "18/09",
    fatal: "20/09",
    origem: "ia",
    stage: "intimacao",
    unread: true,
    orgao: "1ª Vara · Campinas",
    trecho: "",
    publicacao: "26/08",
    nota: "",
  },
  {
    id: "i13",
    providencia: "Tréplica",
    cliente: "Grupo Selene",
    cnj: "0011234-90.2024.8.26.0011",
    resp: "Luan Gomes",
    dias: 7,
    interna: "09/09",
    fatal: "11/09",
    origem: "declarado",
    stage: "protocolado",
    unread: false,
    orgao: "1ª Vara · Pinheiros",
    trecho: "",
    publicacao: "20/08",
    nota: "",
  },
];

const CLIENTES = [
  "Prolheti Formaturas ME",
  "Construtora Vetor",
  "Nutrimed Ltda",
  "Têxtil Aurora S.A.",
  "Bianchi Materiais ME",
  "Lima & Prado",
  "Ativa Log",
  "Grupo Selene",
  "Município de Barueri",
  "Ferragens União",
  "Rede Sabor Alimentos",
  "Óticas Vitral",
  "Transportadora Bandeira",
  "Clínica São Rafael",
  "Auto Peças Delta",
  "Imobiliária Cerrado",
  "Editora Marco",
  "Laticínios Boa Vista",
  "Metalúrgica Praia",
  "Colégio Horizonte",
];
const PROVIDENCIAS = [
  "Contestação",
  "Réplica",
  "Contrarrazões",
  "Manifestação sobre laudo",
  "Especificação de provas",
  "Embargos de Declaração",
  "Cumprimento de sentença",
  "Impugnação",
  "Alegações finais",
  "Recurso Inominado",
  "Agravo de Instrumento",
  "Petição intermediária",
  "Ciência de despacho",
  "Manifestação sobre documentos",
];
export const ORGAOS = [
  "3ª Vara Cível · Guarulhos",
  "TJSP · 2º grau",
  "1ª Vara Cível · Campinas",
  "12ª Vara Cível · Foro Central",
  "Juizado Especial Cível",
  "Vara da Fazenda Pública",
  "2ª Vara Cível · Santos",
];

let CACHE: PrazoMock[] | null = null;

// Gera o volume determinístico (LCG com semente fixa) sobre o SEED. ~1000 itens
// pra a Inbox "chegaram nas últimas 24h" e o Board terem escala real.
export function gerarTodos(): PrazoMock[] {
  if (CACHE) return CACHE;
  const arr = SEED.slice();
  let sd = 20260829;
  const rnd = () => {
    sd = (sd * 9301 + 49297) % 233280;
    return sd / 233280;
  };
  const pk = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 987; i++) {
    const r = rnd();
    let origem: PrazoOrigem;
    if (r < 0.78) {
      const s = rnd();
      origem = s < 0.45 ? "declarado" : s < 0.8 ? "calculado" : "validado";
    } else if (r < 0.9) origem = "divergente";
    else if (r < 0.97) origem = "ia";
    else origem = "semprazo";
    const stage: PrazoStage =
      origem === "semprazo"
        ? "intimacao"
        : rnd() < 0.7
          ? "confirmar"
          : "intimacao";
    const dias = Math.floor(rnd() * 22) - 2;
    const dd = 2 + Math.floor(rnd() * 26);
    arr.push({
      id: "g" + i,
      providencia: pk(PROVIDENCIAS),
      cliente: pk(CLIENTES),
      cnj: 1000000 + Math.floor(rnd() * 8999999) + "-77.2025.8.26.0100",
      resp: pk(EQUIPE),
      dias,
      interna:
        String(Math.max(1, Math.min(28, dd - 2))).padStart(2, "0") + "/09",
      fatal: String(Math.min(28, dd)).padStart(2, "0") + "/09",
      origem,
      stage,
      unread: rnd() < 0.6,
      orgao: pk(ORGAOS),
      trecho: "",
      publicacao: 24 + Math.floor(rnd() * 3) + "/08",
      nota: "",
    });
  }
  CACHE = arr;
  return arr;
}
