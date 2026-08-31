// Rótulos pt-BR dos tipos de documento dos autos (eproc/TJSP). O fetch dos autos
// grava o CÓDIGO cru do eproc (ex.: PET, SENT, DESPADEC, ATOORD) — hoje ele chega
// no campo `title` do DocumentView. Este mapa é a fonte única (Regra nº1) que traduz
// esse código para o rótulo que o card AUTOS exibe. Código desconhecido cai no
// fallback (title-case do próprio código), nunca fica vazio.

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
    TIPO_AUTOS_LABEL[chave] ??
    chave.charAt(0) + chave.slice(1).toLowerCase()
  );
}
