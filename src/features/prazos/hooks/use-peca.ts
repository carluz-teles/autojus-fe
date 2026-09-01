"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { PrazoMock, PrazoStage } from "../mocks/prazos.mock";
import { listPrazos } from "../services/prazos-triagem.service";
import { prazosKeys } from "./use-prazos-inbox";

export type PecaEstado = "vazio" | "gerando" | "pronta";

// Estágios em que a peça já foi trabalhada → abre direto em "pronta".
const JA_ELABORADA: PrazoStage[] = ["elaboracao", "revisao", "protocolado"];

// Fluxo de cada tese no editor: proposta → dentro → remoção → fora.
export type TeseFlow = "off" | "pendAdd" | "on" | "pendRemove";

interface TeseDef {
  id: string;
  label: string;
  desc: string;
  art: string;
  fonteRef: string;
  fonteId: string;
  def: boolean;
}

const TESES_DEF: readonly TeseDef[] = [
  {
    id: "t1",
    label: "Prescrição da pretensão",
    desc: "Pretensão fulminada pelo decurso do prazo",
    art: "art. 206, §5º, do Código Civil",
    fonteRef: "Título executivo · doc. 7",
    fonteId: "f-a1",
    def: true,
  },
  {
    id: "t2",
    label: "Ausência de nexo causal",
    desc: "Dano não decorre da conduta imputada",
    art: "art. 927 do Código Civil",
    fonteRef: "Laudo pericial · fls. 380–421",
    fonteId: "f-a2",
    def: true,
  },
  {
    id: "t3",
    label: "Cerceamento de defesa",
    desc: "Indeferimento de prova essencial",
    art: "art. 5º, LV, da CF",
    fonteRef: "Despacho saneador · fls. 338–340",
    fonteId: "f-a3",
    def: true,
  },
  {
    id: "t4",
    label: "Excesso de execução",
    desc: "Cálculo do exequente supera o título",
    art: "art. 917, §2º, do CPC",
    fonteRef: "Título vs. condenação",
    fonteId: "f-a1",
    def: false,
  },
];

// Argumentos por tese, com a citação (chip verde=ok / gold=?) no meio do parágrafo.
const ARGS_TESE: Record<
  string,
  { pre: string; art: string; ok: boolean; pos: string }
> = {
  t1: {
    pre: "Preliminarmente, impõe-se o reconhecimento da prescrição, contado o prazo quinquenal, nos termos do ",
    art: "art. 206, §5º, do Código Civil",
    ok: true,
    pos: ".",
  },
  t2: {
    pre: "No mérito, inexiste nexo de causalidade entre a conduta imputada e o alegado dano, afastando o dever de indenizar (",
    art: "art. 927 do Código Civil",
    ok: false,
    pos: ").",
  },
  t3: {
    pre: "Houve, ademais, cerceamento de defesa pelo indeferimento de prova essencial ao deslinde da causa (",
    art: "art. 5º, LV, da CF",
    ok: true,
    pos: ").",
  },
  t4: {
    pre: "Por fim, há excesso de execução, porquanto o cálculo do exequente supera o título executivo (",
    art: "art. 917, §2º, do CPC",
    ok: true,
    pos: ").",
  },
};

const CFG_FLOW: Record<
  TeseFlow,
  { marca: string; caixaFundo: string; caixaBorda: string }
> = {
  off: { marca: "", caixaFundo: "transparent", caixaBorda: "var(--line)" },
  pendAdd: {
    marca: "·",
    caixaFundo: "transparent",
    caixaBorda: "var(--primary)",
  },
  on: {
    marca: "✓",
    caixaFundo: "var(--primary)",
    caixaBorda: "var(--primary)",
  },
  pendRemove: {
    marca: "–",
    caixaFundo: "color-mix(in oklch, var(--red) 60%, transparent)",
    caixaBorda: "var(--red)",
  },
};

// ── sub-hook: geração da minuta sob demanda (vazio → gerando → pronta) ──
function useGeracao(jaElaborada: boolean) {
  const [gerado, setGerado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const gerar = useCallback(() => {
    setGerando(true);
    timer.current = setTimeout(() => {
      setGerando(false);
      setGerado(true);
    }, 1400);
  }, []);

  const estado: PecaEstado = gerando
    ? "gerando"
    : gerado || jaElaborada
      ? "pronta"
      : "vazio";
  return { estado, gerar };
}

// ── sub-hook: fluxo das teses (off → pendAdd → on → pendRemove) ──
function useTeses() {
  const [flow, setFlow] = useState<Record<string, TeseFlow>>({});
  const set = useCallback((id: string, st: TeseFlow) => {
    setFlow((s) => ({ ...s, [id]: st }));
  }, []);
  const estadoDe = useCallback(
    (t: TeseDef): TeseFlow => flow[t.id] ?? (t.def ? "on" : "off"),
    [flow],
  );
  return { estadoDe, set };
}

// ── sub-hook: seções colapsáveis do rail (contexto / fontes) ──
function useColapsaveis() {
  const [ctxAberto, setCtxAberto] = useState(true);
  const [fontesAberto, setFontesAberto] = useState(true);
  const [protoAberto, setProtoAberto] = useState(false);
  return {
    ctxAberto,
    toggleCtx: useCallback(() => setCtxAberto((v) => !v), []),
    fontesAberto,
    toggleFontes: useCallback(() => setFontesAberto((v) => !v), []),
    protoAberto,
    toggleProto: useCallback(() => setProtoAberto((v) => !v), []),
    fecharProto: useCallback(() => setProtoAberto(false), []),
  };
}

const CERTS = [
  { label: "Renata Marcondes", meta: "OAB/SP 210.884 · e-CPF A3", tipo: "A3" },
  { label: "Escritório Marcondes", meta: "CNPJ · e-CNPJ A1", tipo: "A1" },
  { label: "Token físico", meta: "SafeNet · slot 1", tipo: "A3" },
];

const TOOLBAR: { titulo: string; conteudo: string; sep?: boolean }[] = [
  { titulo: "Negrito", conteudo: "B" },
  { titulo: "Itálico", conteudo: "I" },
  { titulo: "Sublinhado", conteudo: "U" },
  { titulo: "", conteudo: "", sep: true },
  { titulo: "Título", conteudo: "H" },
  { titulo: "Citação", conteudo: "❝" },
  { titulo: "", conteudo: "", sep: true },
  { titulo: "Lista", conteudo: "•" },
  { titulo: "Lista numerada", conteudo: "1." },
  { titulo: "", conteudo: "", sep: true },
  { titulo: "Alinhar", conteudo: "≡" },
];

// Hook público da peça — port de _pecaDe. Compõe geração + teses + colapsáveis e
// deriva cab/partes/fontes/teses/revisão/direito a partir do PrazoMock (mock-first).
export function usePeca(id: string) {
  const query = useQuery({ queryKey: prazosKeys.all, queryFn: listPrazos });

  const raw: PrazoMock | null = useMemo(() => {
    const all = query.data ?? [];
    return all.find((p) => p.id === id) ?? all[0] ?? null;
  }, [query.data, id]);

  const jaElaborada = raw ? JA_ELABORADA.includes(raw.stage) : false;
  const ger = useGeracao(jaElaborada);
  const teses = useTeses();
  const col = useColapsaveis();

  const model = useMemo(() => {
    if (!raw) return null;
    const est = ger.estado;
    const cnjCurto = raw.cnj.slice(0, 11) + ".";
    const prazo = /Embargos/.test(raw.providencia)
      ? "5"
      : /Inominado/.test(raw.providencia)
        ? "10"
        : "15";

    const tesesVm = TESES_DEF.map((t) => {
      const st = teses.estadoDe(t);
      const cfg = CFG_FLOW[st];
      return {
        ...t,
        estadoFlow: st,
        marca: cfg.marca,
        caixaFundo: cfg.caixaFundo,
        caixaBorda: cfg.caixaBorda,
        temBadge: st === "on",
        badgeLabel: "no texto",
        badgeCor: "var(--green)",
        badgeFundo: "color-mix(in oklch, var(--green) 12%, transparent)",
        borda:
          st === "pendAdd"
            ? "color-mix(in oklch, var(--primary) 40%, transparent)"
            : st === "pendRemove"
              ? "color-mix(in oklch, var(--red) 40%, transparent)"
              : "var(--line)",
        onToggle: () =>
          teses.set(
            t.id,
            st === "off"
              ? "pendAdd"
              : st === "pendAdd"
                ? "off"
                : st === "on"
                  ? "pendRemove"
                  : "on",
          ),
        onFonte: () => toast(`Fonte · ${t.fonteRef}`),
      };
    });
    const nSel = tesesVm.filter((t) => t.estadoFlow !== "off").length;

    let romano = 0;
    const direito = TESES_DEF.filter((t) => teses.estadoDe(t) !== "off").map(
      (t) => {
        const st = teses.estadoDe(t);
        romano += 1;
        const a = ARGS_TESE[t.id];
        return {
          id: t.id,
          label: t.label,
          arg: a,
          pendAdd: st === "pendAdd",
          on: st === "on",
          pendRemove: st === "pendRemove",
          titulo: "II." + romano + " — " + t.label,
          fundo:
            st === "pendAdd"
              ? "color-mix(in oklch, var(--primary) 6%, transparent)"
              : st === "pendRemove"
                ? "color-mix(in oklch, var(--red) 6%, transparent)"
                : "transparent",
          borda:
            st === "pendAdd"
              ? "color-mix(in oklch, var(--primary) 30%, transparent)"
              : st === "pendRemove"
                ? "color-mix(in oklch, var(--red) 30%, transparent)"
                : "var(--line2)",
          textCor: st === "pendRemove" ? "var(--fg3)" : "var(--fg)",
          strike: st === "pendRemove" ? "line-through" : "none",
          aprovar: () => teses.set(t.id, st === "pendRemove" ? "off" : "on"),
          descartar: () => teses.set(t.id, st === "pendRemove" ? "on" : "off"),
          remover: () => teses.set(t.id, "pendRemove"),
        };
      },
    );

    const fontesDef = [
      {
        id: "f-teor",
        tipo: "Teor",
        cor: "var(--primary)",
        titulo: "Intimação de origem",
        meta: "Publicado " + raw.publicacao + " · DJEN · ~1 lauda",
      },
      {
        id: "f-a1",
        tipo: "Auto",
        cor: "var(--fg3)",
        titulo: "Procuração e contrato social",
        meta: "fls. 49–57",
      },
      {
        id: "f-a2",
        tipo: "Auto",
        cor: "var(--gold)",
        titulo: "Laudo pericial",
        meta: "fls. 380–421",
      },
      {
        id: "f-a3",
        tipo: "Auto",
        cor: "var(--blue)",
        titulo: "Despacho saneador",
        meta: "fls. 338–340",
      },
    ];

    return {
      estVazio: est === "vazio",
      estGerando: est === "gerando",
      estPronta: est === "pronta",
      titulo: raw.providencia,
      cliente: raw.cliente,
      cnj: raw.cnj,
      cnjCurto,
      orgao: raw.orgao,
      resp: raw.resp,
      publicacao: raw.publicacao,
      statusLabel:
        est === "pronta"
          ? "Rascunho"
          : est === "gerando"
            ? "Gerando…"
            : "Vazia",
      cab: {
        cnjCurto,
        classe:
          (/Apela/.test(raw.providencia)
            ? "Apelação Cível"
            : "Procedimento Comum") +
          " · " +
          (/2º grau|TJSP/.test(raw.orgao) ? "TJSP · 2º grau" : "1º grau"),
        proc: [
          { rot: "Assunto", val: "Excesso de execução · Prescrição" },
          { rot: "Órgão", val: raw.orgao },
          { rot: "Valor", val: "R$ 180.000,00" },
        ],
        intimMeta: [
          { rot: "Nº", val: "Expediente nº 4471902/2024", forte: false },
          { rot: "Fonte", val: "DJEN", forte: false },
          { rot: "Publicação", val: raw.publicacao, forte: false },
          {
            rot: "Ciência",
            val: raw.publicacao + " (publicação)",
            forte: false,
          },
          { rot: "Prazo", val: prazo + " dias úteis", forte: true },
        ],
        teor:
          raw.trecho ||
          "Intimada a parte para, querendo, interpor recurso de apelação no prazo legal, sob pena de trânsito em julgado.",
      },
      partes: [
        {
          nome: "Banco Meridiano S/A",
          papel: "Apelado",
          proc: "Dr. L. Furtado · OAB/SP 71.220",
          cliente: false,
        },
        {
          nome: raw.cliente,
          papel: "Apelante",
          proc: "Dra. " + raw.resp + " · OAB/SP 210.884",
          cliente: true,
        },
      ],
      fontes: fontesDef.map((f) => ({
        ...f,
        tipoFundo: `color-mix(in oklch, ${f.cor} 12%, transparent)`,
        onOpen: () => toast(`Fonte · ${f.titulo}`),
      })),
      teses: tesesVm,
      nSel,
      nTesesLabel: nSel + (nSel === 1 ? " tese" : " teses"),
      enderecamento:
        "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA " +
        (raw.orgao || "").toUpperCase(),
      revisao: [
        { txt: "Endereçamento ao juízo correto", done: true },
        { txt: "Prazo fatal citado (" + raw.fatal + ")", done: true },
        { txt: "Pedidos claros e delimitados", done: true },
        { txt: "Assinatura e OAB do responsável", done: false },
      ],
      direito,
      direitoVazio: direito.length === 0,
      skelLinhas: [92, 78, 96, 64, 88, 72],
      toolbar: TOOLBAR,
    };
  }, [raw, ger.estado, teses]);

  const certs = useMemo(
    () =>
      CERTS.map((c) => ({
        ...c,
        onSelect: () => {
          col.fecharProto();
          toast.success(`Protocolando · assinado com ${c.label}`);
        },
      })),
    [col],
  );

  return {
    isLoading: query.isLoading,
    model,
    // rail colapsável
    ctxAberto: col.ctxAberto,
    toggleCtx: col.toggleCtx,
    fontesAberto: col.fontesAberto,
    toggleFontes: col.toggleFontes,
    // protocolar dropdown
    protoAberto: col.protoAberto,
    toggleProto: col.toggleProto,
    fecharProto: col.fecharProto,
    certs,
    // geração
    gerar: ger.gerar,
    refazer: ger.gerar,
    // ações da barra
    voltar: () => toast("Voltar para a intimação"),
    salvar: () => toast.success("Rascunho salvo"),
    enviarRevisao: () => toast.success("Enviado para revisão do sócio"),
    verTeor: () => toast("Abrindo inteiro teor…"),
    exec: (titulo: string) => toast(`Formatação · ${titulo}`),
  };
}
