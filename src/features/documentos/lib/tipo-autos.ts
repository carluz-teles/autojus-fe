// Rótulos pt-BR dos tipos de documento dos autos (eproc/TJSP). O fetch dos autos
// grava o CÓDIGO cru do eproc (ex.: PET, SENT, DESPADEC, ATOORD) — hoje ele chega
// no campo `title` do DocumentView. Este mapa é a fonte única (Regra nº1) que traduz
// esse código para o rótulo que o card AUTOS exibe. Código desconhecido cai no
// fallback (title-case do próprio código), nunca fica vazio.

import { formatarData } from "@/lib/utils";

const TIPO_AUTOS_LABEL: Record<string, string> = {
  // petições / manifestações
  PET: "Petição",
  PETINI: "Petição inicial",
  INIC: "Petição inicial",
  CONT: "Contestação",
  REPL: "Réplica",
  MANIF: "Manifestação",
  EMBDECL: "Embargos de declaração",
  RECURSO: "Recurso",
  APEL: "Apelação",
  AGRAVO: "Agravo",
  CONTRAZ: "Contrarrazões",
  // decisões / despachos / sentenças
  SENT: "Sentença",
  DEC: "Decisão",
  DECISAO: "Decisão",
  DESP: "Despacho",
  DESPADEC: "Despacho / Decisão",
  ATOORD: "Ato ordinatório",
  // certidões / comunicações
  CERT: "Certidão",
  CARTA: "Carta",
  AR: "Aviso de recebimento",
  OFIC: "Ofício",
  MAND: "Mandado",
  INTIM: "Intimação",
  PRECATORIA: "Carta precatória",
  // provas / anexos / instrução
  LAUDO: "Laudo pericial",
  DOC: "Documento",
  DOCUMENTACAO: "Documentação",
  PROC: "Procuração",
  CONTR: "Contrato",
  CONTRSOCIAL: "Contrato social",
  CALC: "Cálculo",
  COMP: "Comprovante",
  GUIA: "Guia",
  CDA: "Certidão de dívida ativa",
  ATA: "Ata",
  EMAIL: "E-mail",
  "REL.PESQ.ENDERECO": "Pesquisa de endereço",
  "PROTOCOLO ORDEM": "Protocolo",
  DETSISPARTOT: "Detalhamento",
  OUT: "Outros",
};

// Converte um código cru (SENT, DESPADEC…) no rótulo pt-BR. Sem match, faz um
// title-case defensivo do código para nunca renderizar em branco.
export function rotuloTipoAuto(codigo: string): string {
  const chave = (codigo || "").trim().toUpperCase();
  if (!chave) return "Documento";
  return (
    TIPO_AUTOS_LABEL[chave] ?? chave.charAt(0) + chave.slice(1).toLowerCase()
  );
}

// Categoria semântica do auto — o "Tipo" do subtítulo "Tipo · Origem" e a base da cor.
type Categoria = "Petição" | "Documento" | "Decisão" | "Comunicação" | "Prova";

const CATEGORIA_POR_CODIGO: Record<string, Categoria> = {
  PET: "Petição",
  PETINI: "Petição",
  INIC: "Petição",
  CONT: "Petição",
  REPL: "Petição",
  MANIF: "Petição",
  EMBDECL: "Petição",
  RECURSO: "Petição",
  APEL: "Petição",
  AGRAVO: "Petição",
  CONTRAZ: "Petição",
  INTIM: "Petição",
  SENT: "Decisão",
  DEC: "Decisão",
  DECISAO: "Decisão",
  DESP: "Decisão",
  DESPADEC: "Decisão",
  ATOORD: "Decisão",
  CERT: "Comunicação",
  CARTA: "Comunicação",
  AR: "Comunicação",
  OFIC: "Comunicação",
  MAND: "Comunicação",
  PRECATORIA: "Comunicação",
  "PROTOCOLO ORDEM": "Comunicação",
  EMAIL: "Comunicação",
  LAUDO: "Prova",
  "REL.PESQ.ENDERECO": "Prova",
};

// Cor de token por categoria (ícone do auto). Petição/Decisão azul, Documento verde,
// Comunicação neutro, Prova âmbar — espelha a leitura de cores do protótipo (sem o
// vermelho de "Adverso", que não temos como derivar por doc).
const COR_POR_CATEGORIA: Record<Categoria, string> = {
  Petição: "var(--blue)",
  Decisão: "var(--blue)",
  Documento: "var(--green)",
  Comunicação: "var(--fg3)",
  Prova: "var(--gold)",
};

// Origem DERIVÁVEL do tipo: decisões/comunicações vêm do Juízo, laudo do Perito, o
// resto é da Parte. NÃO tentamos "Nosso vs Adverso" (exigiria saber quem protocolou).
const ORIGEM_POR_CATEGORIA: Record<Categoria, string> = {
  Petição: "Parte",
  Documento: "Parte",
  Decisão: "Juízo",
  Comunicação: "Juízo",
  Prova: "Perito",
};

export interface AutoVisual {
  categoria: Categoria;
  origem: string;
  cor: string;
}

// Deriva categoria + origem + cor do auto a partir do código eproc do tipo. Código
// desconhecido cai em "Documento"/Parte/verde (o mais neutro e comum).
export function visualDoAuto(codigo: string): AutoVisual {
  const chave = (codigo || "").trim().toUpperCase();
  const categoria = CATEGORIA_POR_CODIGO[chave] ?? "Documento";
  return {
    categoria,
    origem: ORIGEM_POR_CATEGORIA[categoria],
    cor: COR_POR_CATEGORIA[categoria],
  };
}

/**
 * Identificação legível de um auto pra lista "Autos do processo" (A4,
 * docs/qa-remediation-evidence/fe-operations-architecture.md). `nome` é derivado
 * do tipo (`rotuloTipoAuto`); a `meta` desambigua autos do MESMO tipo (ex.: 3
 * "Petição") pela DATA.
 *
 * Data: prefere a data JURÍDICA do ato (`court_event_date`, agora projetada no
 * DocumentView pelo BE — `viewFromListRow`/`viewFromGetRow` em
 * internal/document/mapper.go). Quando ausente/null (UPLOAD humano, ou doc COURT
 * capturado antes da coluna existir), cai para `created_at` (data de CAPTURA, já
 * no DTO — nunca inventada) VISIVELMENTE ROTULADA como "Capturado em …", nunca
 * apresentada como a data do ato. Assim dois PDFs capturados na mesma leva ficam
 * distinguíveis pela data do ato real quando ela existe, e o fallback é honesto
 * quando não existe.
 */
export function identificarAuto(doc: {
  document_type: string;
  title: string;
  created_at: string;
  court_event_date?: string | null;
  pages?: number;
  origin: "COURT" | "UPLOAD";
}): { nome: string; meta: string } {
  const dataSegmento = doc.court_event_date
    ? formatarData(doc.court_event_date)
    : doc.created_at
      ? `Capturado em ${formatarData(doc.created_at)}`
      : "";
  return {
    nome: rotuloTipoAuto(doc.document_type),
    meta: [
      dataSegmento,
      doc.title,
      doc.pages ? `${doc.pages} pág.` : "",
      doc.origin === "UPLOAD" ? "Anexo do escritório" : "Autos",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
