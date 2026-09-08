"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAndamentosDoProcesso } from "@/features/andamentos/hooks/use-andamentos-do-processo";
import type { OpenDocument } from "@/features/documentos/components/pdf-drawer";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";
import {
  rotuloTipoAuto,
  visualDoAuto,
} from "@/features/documentos/lib/tipo-autos";
import { prazoVisivel } from "@/features/intimacoes/lib/prazo-visivel";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { usePecasByProcesso } from "@/features/pecas/hooks/use-peca";
import { rotuloTipoPeca } from "@/features/pecas/lib/labels";
import {
  useIntimacoesByProcesso,
  usePrazosByProcesso,
} from "@/features/processos/hooks/use-processo-tabs";
import {
  useAssignResponsavel,
  usePartes,
  useProcesso,
  useUpdateProcessoManual,
} from "@/features/processos/hooks/use-processos";
import {
  linhaProcesso,
  retornoProcessos,
} from "@/features/processos/lib/apresentacao";
import {
  intimacaoPendente,
  parseValorCausa,
  prazoPendente,
  urgenciaPrazo,
} from "@/features/processos/lib/detalhe";
import type { ProcessoPhase } from "@/features/processos/types";
import { ORIGEM_LABEL } from "@/features/triagem/lib/origem";
import { formatDate } from "@/lib/format";

import { tipoAtoLabel } from "../lib/labels";

export interface RegistroProcesso {
  id: string;
  titulo: string;
  descricao?: string;
  meta: string;
  status: string;
  variant: "secondary" | "success" | "warning" | "destructive";
  href?: string;
  responsavel?: { id?: string | null; nome?: string | null };
  prazo?: ReturnType<typeof urgenciaPrazo> & { data: string };
}

export function useProcessoHub(id: string) {
  const params = useSearchParams();
  const processoQ = useProcesso(id);
  const p = processoQ.data;
  const intQ = useIntimacoesByProcesso(id);
  const prazoQ = usePrazosByProcesso(id);
  const autos = useDocumentosDoProcesso(id);
  const pecasQ = usePecasByProcesso(id);
  const partesQ = usePartes(id);
  const andQ = useAndamentosDoProcesso(id);
  const directory = useOrgMembersDirectory();
  const assignQ = useAssignResponsavel(id);
  const manual = useUpdateProcessoManual(id);
  const [historico, setHistorico] = useState(false);
  const [trabalhoTab, setTrabalhoTab] = useState("intimacoes");
  const [acervoTab, setAcervoTab] = useState("autos");
  const [documento, setDocumento] = useState<OpenDocument | null>(null);
  const [editando, setEditando] = useState(false);
  const [label, setLabel] = useState("");
  const [phase, setPhase] = useState<ProcessoPhase | "">("");
  const [valor, setValor] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const voltarHref = retornoProcessos(params.get("retorno"));
  const detalheHref = `/processos/${id}?retorno=${encodeURIComponent(voltarHref)}`;
  const intHref = (intId: string) =>
    `/intimacoes/${intId}?retorno=${encodeURIComponent(detalheHref)}`;

  const intimacoes: RegistroProcesso[] = intQ.data
    .filter((i) => historico || intimacaoPendente(i))
    .map((i) => {
      const prazo = prazoVisivel(i);
      const ativo = intimacaoPendente(i);
      return {
        id: i.id,
        titulo: prazo?.tipo_ato
          ? tipoAtoLabel(prazo.tipo_ato)
          : i.type === "CITACAO"
            ? "Citação"
            : "Intimação",
        descricao: i.content_preview,
        meta: `Publicada em ${formatDate(i.published_at)}`,
        responsavel: {
          id: i.assignee_user_id,
          nome: i.assignee_user_name || directory.nameFor(i.assignee_user_id),
        },
        status:
          i.status === "CANCELLED"
            ? "Cancelada"
            : i.user_status === "RESOLVED"
              ? "Resolvida"
              : i.user_status === "IGNORED"
                ? "Ignorada"
                : ORIGEM_LABEL[i.estado] || "Em triagem",
        variant: !ativo
          ? "secondary"
          : ["ia", "a_classificar", "divergente"].includes(i.estado)
            ? "warning"
            : "secondary",
        href: intHref(i.id),
        prazo:
          ativo && prazo && prazoPendente(prazo)
            ? {
                ...urgenciaPrazo(prazo.days_left),
                data: formatDate(prazo.end_date),
              }
            : undefined,
      };
    });
  const prazos: RegistroProcesso[] = prazoQ.prazos
    .filter((d) => historico || prazoPendente(d))
    .map((d) => {
      const ativa = prazoPendente(d);
      return {
        id: d.id,
        titulo: tipoAtoLabel(d.tipo_ato),
        meta:
          d.status === "NO_DEADLINE"
            ? "Sem vencimento aplicável"
            : `Início: ${formatDate(d.start_date ?? null)} · ${d.days ? `${d.days} dias` : "Contagem em dias"} ${d.counting === "BUSINESS" ? "úteis" : "corridos"}${d.doubled ? " · Prazo em dobro" : ""}`,
        status:
          d.status === "NO_DEADLINE"
            ? "Sem prazo"
            : d.status === "MET"
              ? "Cumprido"
              : d.status === "CANCELLED"
                ? "Cancelado"
                : !ativa
                  ? "Intimação encerrada"
                  : "Em aberto",
        variant: "secondary",
        href: intHref(d.intimation_id),
        prazo:
          d.status !== "NO_DEADLINE"
            ? {
                ...(ativa
                  ? urgenciaPrazo(d.days_left)
                  : {
                      label: "Vencimento registrado",
                      variant: "secondary" as const,
                    }),
                data: formatDate(d.end_date),
              }
            : undefined,
      };
    });
  const docs = autos.documentos.map((d) => {
    const vis = visualDoAuto(d.document_type || d.title);
    return {
      id: d.id,
      titulo: d.title || d.original_filename || rotuloTipoAuto(d.document_type),
      meta: `${d.origin === "UPLOAD" ? "Enviado pelo escritório" : `${vis.categoria} · ${vis.origem}`} · ${formatDate(d.created_at)}${d.pages ? ` · ${d.pages} ${d.pages === 1 ? "página" : "páginas"}` : ""}`,
      status:
        d.status === "FAILED"
          ? "Falha no processamento"
          : d.status === "READY"
            ? "Disponível"
            : d.status === "PENDING"
              ? "Envio pendente"
              : "Processando texto",
      variant:
        d.status === "FAILED"
          ? ("warning" as const)
          : d.status === "READY"
            ? ("success" as const)
            : ("secondary" as const),
      podeAbrir: d.status !== "PENDING",
      visualizavel:
        !d.mime_type ||
        [
          "application/pdf",
          "pdf",
          "text/html",
          "application/xhtml+xml",
          "html",
          "htm",
        ].includes(d.mime_type.split(";")[0].trim().toLowerCase()) ||
        /\.(pdf|html?)$/i.test(d.original_filename || d.title),
    };
  });
  const pecas: RegistroProcesso[] = pecasQ.items.map((d) => ({
    id: d.id,
    titulo: d.title || rotuloTipoPeca(d.piece_type),
    meta: `${rotuloTipoPeca(d.piece_type)} · Criada em ${formatDate(d.created_at)}`,
    status:
      {
        DRAFT: "Rascunho",
        SIGNED: "Assinada",
        FILED: "Protocolada",
        DISCARDED: "Descartada",
      }[d.status] || "Peça",
    variant: d.status === "FILED" ? "success" : "secondary",
    href: `/pecas/${d.id}`,
  }));
  const partes = partesQ.data
    ? [
        ...partesQ.data.autor.map((a, index) => ({
          ...a,
          papel: "Autor",
          key: `autor-${index}`,
        })),
        ...partesQ.data.reu.map((a, index) => ({
          ...a,
          papel: "Réu",
          key: `reu-${index}`,
        })),
        ...partesQ.data.terceiros.map((a, index) => ({
          ...a,
          papel: "Terceiro",
          key: `terceiro-${index}`,
        })),
      ]
    : [];

  function irParaTrabalho() {
    setTrabalhoTab("prazos");
    setHistorico(false);
    const section = document.getElementById("processo-trabalho");
    section?.scrollIntoView({ block: "start" });
    section?.focus({ preventScroll: true });
  }

  function abrirEdicao() {
    setLabel(p?.label || "");
    setPhase(p?.phase || "");
    setValor(
      p?.claim_value == null
        ? ""
        : p.claim_value.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
    );
    setFormError("");
    setEditando(true);
  }
  async function salvar() {
    const amount = parseValorCausa(valor);
    if (amount !== null && Number.isNaN(amount)) {
      setFormError("Informe um valor válido, como 1.500,00.");
      return;
    }
    if (amount === null && p?.claim_value != null) {
      setFormError("Informe o valor da causa. Para valor zero, preencha 0,00.");
      return;
    }
    setFormError("");
    try {
      const changes = {
        ...(label.trim() !== (p?.label || "") ? { label: label.trim() } : {}),
        ...(phase && phase !== p?.phase ? { phase } : {}),
        ...(amount !== null && amount !== p?.claim_value
          ? { claim_value: amount }
          : {}),
      };
      if (Object.keys(changes).length > 0) await manual.mutateAsync(changes);
      setEditando(false);
      toast.success("Dados do processo atualizados.");
    } catch {
      setFormError(
        "Não foi possível salvar. Seus ajustes foram mantidos; tente novamente.",
      );
    }
  }
  function enviarDocumento(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setUploadError("Selecione um arquivo PDF.");
      return;
    }
    setUploadError("");
    autos.upload.enviar(file);
  }
  async function copiarCNJ() {
    try {
      await navigator.clipboard.writeText(p?.cnj_number || "");
      toast.success("CNJ copiado.");
    } catch {
      toast.error(
        "Não foi possível copiar o CNJ. Selecione o número para copiá-lo.",
      );
    }
  }

  return {
    irParaTrabalho,
    processoQ,
    processo: p,
    identity: p ? linhaProcesso(p) : null,
    voltarHref,
    intQ,
    prazoQ,
    autos,
    pecasQ,
    partesQ,
    andQ,
    intimacoes,
    prazos,
    docs,
    pecas,
    partes,
    historico,
    setHistorico,
    trabalhoTab,
    setTrabalhoTab,
    acervoTab,
    setAcervoTab,
    verAutos: () => {
      setAcervoTab("autos");
      const section = document.getElementById("processo-acervo");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
    },
    documento,
    abrirDocumento: (doc: OpenDocument) => setDocumento(doc),
    fecharDocumento: () => setDocumento(null),
    copiarCNJ,
    enviarDocumento,
    uploadError,
    editando,
    setEditando,
    abrirEdicao,
    label,
    setLabel,
    phase,
    setPhase,
    valor,
    setValor,
    formError,
    salvar,
    salvando: manual.isPending,
    members: directory.members,
    responsavel:
      p?.assigned_user_name ||
      (p?.assigned_user_id && directory.nameFor(p.assigned_user_id)) ||
      (p?.assigned_user_id ? "Responsável atribuído" : "Sem responsável"),
    assign: (userId: string | null) =>
      assignQ.mutate(userId || null, {
        onSuccess: () => toast.success("Responsável atualizado."),
        onError: () => toast.error("Não foi possível atualizar o responsável."),
      }),
    assigning: assignQ.isPending,
    distribuido: formatDate(p?.filed_at ?? null, "Não informada"),
    valorFormatado:
      p?.claim_value == null
        ? "Não informado"
        : p.claim_value.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
    segredo: {
      PUBLIC: "Público",
      RESTRICTED: "Acesso restrito",
      SECRET: "Segredo de justiça",
    }[p?.secrecy || "PUBLIC"],
  };
}
