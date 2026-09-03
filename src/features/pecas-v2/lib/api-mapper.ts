// Mapper snake_case (BE) → camelCase (tipos do domínio v2). Todos os campos
// que o FE consome saem daqui. Campos que o BE não expõe hoje (intimation.title,
// deadline em dias) são derivados aqui pra manter a UI intocada.

import { htmlToText } from "@/lib/html/html-to-text";

import type {
  ChatMessage,
  Draft,
  DraftAttachment,
  DraftDeadline,
  DraftIntimation,
  DraftParty,
  DraftPartyGroup,
  DraftPreamble,
  DraftProcess,
  DraftProcessDocument,
  DraftProvidence,
  DraftSection,
  PendingChange,
  SagaState,
  Status,
  Thesis,
  ThesisState,
} from "../types";
import type {
  AttachmentAPI,
  ChatMessageAPI,
  IntimationAPI,
  PartyAPI,
  PecaDetailAPI,
  ProcessAPI,
  ProcessDocumentAPI,
  ProvidenceAPI,
  SectionChangeAPI,
  StructuredContentAPI,
  ThesisAPI,
} from "./api-types";

// ── Draft ────────────────────────────────────────────────────────────────────

export function mapPecaDetailToDraft(api: PecaDetailAPI): Draft {
  const structured = api.structured_content;
  return {
    id: api.id,
    pieceType: api.piece_type,
    title: humanizeTitle(api.title, api.piece_type),
    status: (api.status as Status) ?? "DRAFT",
    sagaState: (api.saga_state as SagaState) ?? "CREATED",
    authorship: api.authorship,
    updatedAt: api.updated_at,
    preamble: mapPreamble(structured),
    sections: mapSections(structured),
    intimation: mapIntimation(api.intimation),
    process: mapProcess(api.process),
    parties: (api.parties ?? []).flatMap(mapParty),
    partyGroups: (api.parties ?? []).map(mapPartyGroup),
    providences: (api.providences ?? []).map(mapProvidence),
    attachments: (api.attachments ?? []).map(mapAttachment),
    processDocuments: (api.process_documents ?? []).map(mapProcessDocument),
    deadline: mapDeadline(api.deadline),
    // TODO(B5): count real de teses. O PecaDetailAPI não expõe a contagem e este
    // mapper não tem a lista (que vem de GET /v1/pecas/:id/theses, em useThesesController).
    // Só é usado pelo texto cosmético do EditorBanner ("…e de N teses") no editor
    // pós-geração, onde o controller de teses não está em escopo — derivar aqui exigiria
    // threa­dar uma nova query pelo editor-area. Mantido fixo pra não acoplar/quebrar.
    thesisCount: 3,
    sentToSigningAt: api.sent_to_signing_at,
    signedAt: api.signed_at,
    filedAt: api.filed_at,
    filingNumber: api.filing_number ?? "",
    signedPDFURL: api.signed_pdf_url,
    contentHtml: api.content_html,
    contentEdited: !!api.content_edited,
  };
}

function humanizeTitle(title: string, pieceType: string): string {
  if (title && title.trim() !== "") return title;
  switch ((pieceType || "").toUpperCase()) {
    case "DEFENSE":
      return "Defesa";
    case "COMPLAINT":
      return "Petição";
    case "APPEAL":
      return "Recurso";
    case "MOTION":
      return "Manifestação";
    default:
      return "Peça";
  }
}

function mapPreamble(structured: StructuredContentAPI | null): DraftPreamble {
  if (!structured) return { paragraphs: [] };
  return { paragraphs: structured.preamble?.paragraphs ?? [] };
}

function mapSections(structured: StructuredContentAPI | null): DraftSection[] {
  if (!structured) return [];
  return (structured.sections ?? []).map((s) => ({
    id: s.id,
    roman: s.roman,
    title: s.title,
    shortTitle: s.short_title,
    paragraphs: s.paragraphs ?? [],
  }));
}

function mapIntimation(api: IntimationAPI | null): DraftIntimation {
  if (!api) {
    return { id: "", title: "", publishedAt: "", teor: "" };
  }
  return {
    id: api.id,
    title: humanizeIntimationType(api.type),
    publishedAt: formatDatePt(api.made_available_at),
    // O teor do DJEN chega como HTML cru; o card/drawer do pecas-v2 exibem como
    // TEXTO, então extraímos o texto legível aqui (ver htmlToText). Fica no boundary
    // do mapper → cobre card + drawer num ponto só.
    teor: htmlToText(api.content),
  };
}

function humanizeIntimationType(t: string): string {
  switch ((t || "").toUpperCase()) {
    case "CITACAO":
      return "Citação";
    case "INTIMACAO":
      return "Intimação";
    case "COMUNICACAO":
      return "Comunicação";
    default:
      return t || "Intimação";
  }
}

function mapProcess(api: ProcessAPI | null): DraftProcess {
  if (!api) {
    return {
      courtRecordId: "",
      cnj: "",
      classe: "",
      assunto: "",
      orgao: "",
      tribunalGrau: "",
      valor: "",
      distribuicao: "",
    };
  }
  return {
    courtRecordId: api.court_record_id,
    cnj: api.cnj_number,
    classe: api.class,
    assunto: api.subject,
    orgao: api.judging_body,
    tribunalGrau: `${api.court} · ${api.degree}`,
    valor: formatBrl(api.claim_value),
    distribuicao: "", // BE não expõe no read model v0
  };
}

function mapDeadline(api: PecaDetailAPI["deadline"]): DraftDeadline {
  if (!api) return { endDate: "", daysLeft: Number.POSITIVE_INFINITY };
  return {
    endDate: formatDatePt(api.end_date),
    daysLeft: api.days_left ?? 0,
  };
}

function mapAttachment(api: AttachmentAPI): DraftAttachment {
  return {
    id: api.id,
    name: api.name,
    sizeLabel: formatBytes(api.size_bytes),
    category: api.category ?? "Outro",
  };
}

function mapProcessDocument(api: ProcessDocumentAPI): DraftProcessDocument {
  return {
    id: api.id,
    label: api.label,
    documentType: api.document_type,
    typeLabel: api.type_label ?? "",
    eventDate: api.event_date ? formatDatePt(api.event_date) : "",
    pages: api.pages,
    status: api.status,
  };
}

function mapProvidence(api: ProvidenceAPI): DraftProvidence {
  return {
    code: `TAR-${api.id.slice(0, 3).toUpperCase()}`,
    title: api.title,
    origin: api.source === "MANUAL" ? "manual" : "sugerida",
  };
}

// Uma parte do BE (PLAINTIFF/DEFENDANT/THIRD_PARTY) explode em N entradas na
// UI: a própria parte (autor/reu) + uma entrada procurador pra CADA counsel.
// THIRD_PARTY não tem lugar na sidebar hoje; ignorado (documentado como débito).
function mapParty(api: PartyAPI): DraftParty[] {
  const out: DraftParty[] = [];
  const uiRole = roleFromApi(api.role);
  if (uiRole === "autor" || uiRole === "reu") {
    out.push({ role: uiRole, name: api.name });
  }
  for (const c of api.counsels ?? []) {
    out.push({
      role: "procurador",
      name: c.name || "(sem nome)",
      detail: formatOab(c),
    });
  }
  return out;
}

function roleFromApi(r: PartyAPI["role"]): "autor" | "reu" | null {
  if (r === "PLAINTIFF") return "autor";
  if (r === "DEFENDANT") return "reu";
  return null;
}

// Agrupa uma parte (não explode counsels): uma linha por parte para o rail
// PARTES da Construção. Os procuradores viram um rótulo único.
function mapPartyGroup(api: PartyAPI): DraftPartyGroup {
  const counselLabel = (api.counsels ?? [])
    .map((c) => {
      const oab = formatOab(c);
      return oab
        ? `${c.name || "(sem nome)"} · ${oab}`
        : c.name || "(sem nome)";
    })
    .join("; ");
  return {
    roleLabel: roleLabelFromApi(api.role),
    name: api.name,
    counselLabel,
    // Fallback (BE ainda não confirmou is_client no read model): quando ausente,
    // o cliente do escritório costuma ser o réu na peça de defesa (contestação).
    // Ver nota de reconciliação no relatório.
    isClient: api.is_client ?? api.role === "DEFENDANT",
  };
}

function roleLabelFromApi(r: PartyAPI["role"]): string {
  if (r === "PLAINTIFF") return "Autor";
  if (r === "DEFENDANT") return "Réu";
  return "Terceiro";
}

// ── Teses ────────────────────────────────────────────────────────────────────

export function mapThesisFromApi(api: ThesisAPI): Thesis {
  return {
    id: api.id,
    label: api.label,
    foundation: api.foundation,
    legalRef: api.legal_ref,
    // Proveniência: doc do caso OU teor da intimação. Colapsamos numa única
    // referência (sourceDocumentId) — pra teor, é o intimation id, que casa com
    // o id do item "Intimação de origem" na Fundada em ("ver fonte" destaca ele).
    sourceDocumentId: api.source_document_id || api.source_intimation_id || "",
    sourceLabel: api.source_label,
    sourceExcerpt: api.source_excerpt,
    anchors: (api.anchors ?? []).map((a) => ({
      documentId: a.document_id,
      label: a.label,
      excerpt: a.excerpt,
      page: a.page,
      grounded: !!a.grounded,
    })),
    segments: (api.segments ?? []).map((s) => ({
      heading: s.heading,
      conteudo: s.conteudo,
    })),
    grounded: !!api.grounded,
    state: (api.state as ThesisState) ?? "off",
    position: api.position ?? 0,
  };
}

function formatOab(c: { oab: string; uf: string }): string | undefined {
  if (!c.oab) return undefined;
  const uf = c.uf || "??";
  return `OAB/${uf} nº ${c.oab}`;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export function mapChatMessageFromApi(api: ChatMessageAPI): ChatMessage {
  return {
    id: api.id,
    role: api.role,
    content: api.content,
    createdAt: api.created_at,
    citations: (api.citations ?? []).map((c) => ({
      documentId: c.document_id,
      page: c.page,
      quote: c.quote,
    })),
    grounded: !!api.grounded,
  };
}

// ── Iterate (SectionChangeAPI → PendingChange) ──────────────────────────────

export function mapSectionChangeFromApi(
  api: SectionChangeAPI,
  overrides?: { category?: string; explanation?: string },
): PendingChange {
  return {
    sectionId: api.section_id,
    sectionRoman: api.section_roman,
    sectionTitle: api.section_title,
    category: overrides?.category ?? api.category,
    explanation: overrides?.explanation ?? api.explanation,
    oldParagraphs: api.old_paragraphs ?? [],
    newParagraphs: api.new_paragraphs ?? [],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDatePt(iso: string): string {
  if (!iso) return "";
  // Aceita "2026-08-19" ou "2026-08-19T00:00:00Z". Reformata pra dd/mm/aaaa
  // usando split (evita fusos horários).
  const dateOnly = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = dateOnly.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Formata um valor decimal em string (ex.: "180000.00") como BRL
// ("R$ 180.000,00"). Vazio/nulo/inválido → "".
function formatBrl(value: string | null | undefined): string {
  if (!value) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}
