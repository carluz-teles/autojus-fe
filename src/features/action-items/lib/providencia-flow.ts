import { filingPresentation } from "@/features/filing/presentation";
import type { FilingAttempt } from "@/features/filing/types";

import type { ActionItemView } from "../types";

export interface FlowDraft {
  id: string;
  title: string;
  status: string;
  saga_state: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  sent_to_signing_at: string | null;
  signed_at: string | null;
  filed_at: string | null;
  filing_number: string;
}
export interface FlowPreparation {
  status: "QUEUED" | "PREPARING" | "PREPARED" | "CHECK_REQUIRED";
  message: string;
}
export interface FlowEvidence {
  draft?: FlowDraft;
  filing?: FilingAttempt | null;
  preparation?: FlowPreparation | null;
  loading?: boolean;
  unavailable?: boolean;
}
export type FlowStepId =
  "origin" | "work" | "writing" | "review" | "filing" | "done";
export type FlowStepState = "recorded" | "current" | "pending" | "unrecorded";
export interface FlowStep {
  id: FlowStepId;
  label: string;
  state: FlowStepState;
  detail: string;
}

/** Presentation only. No step changes status, approves a draft or sends to court. */
export function providenciaFlow(
  p: ActionItemView,
  evidence: FlowEvidence = {},
) {
  const draft = evidence.draft?.id === p.draft_id ? evidence.draft : undefined;
  const filing =
    evidence.filing?.draft_id === p.draft_id ? evidence.filing : null;
  const preparation = p.draft_id ? evidence.preparation : undefined;
  const withPiece = p.gera_peca || Boolean(p.draft_id);
  const cancelled = p.status === "CANCELLED" || p.status === "DISMISSED";
  const done = p.status === "DONE";
  const terminal = done || cancelled;
  const saga = draft?.saga_state ?? p.draft_state;
  // REVIEWED is the AI review, not the lawyer's approval. Only explicit
  // workflow milestones support progressing beyond human review.
  const released = Boolean(draft?.sent_to_signing_at || draft?.signed_at);
  const filed = filing
    ? filing.status === "PROTOCOLADO"
    : Boolean(
        draft?.status === "FILED" && draft.filed_at && draft.filing_number,
      );
  const written = Boolean(
    p.draft_id &&
    (["DRAFTED", "REVIEWED"].includes(saga ?? "") || released || filed),
  );
  const preparing = Boolean(preparation);
  let current: FlowStepId = "work";
  let title =
    p.status === "SUGGESTED"
      ? "Revisar a providência sugerida"
      : "Organizar a execução";
  let description =
    p.status === "SUGGESTED"
      ? "Confira o tipo e as orientações antes de adicionar este trabalho à fila."
      : withPiece
        ? "Confira as orientações, o responsável e o prazo. Depois, prepare a peça vinculada a esta providência."
        : "Execute as orientações e registre a conclusão. Este trabalho não exige a geração de uma peça.";
  if (p.draft_id) {
    current = written ? "review" : "writing";
    title = written ? "Revisar a peça" : "Preparar a peça";
    description = written
      ? "A minuta está disponível. O advogado precisa conferir o conteúdo e concluir a elaboração antes de avançar."
      : "Abra a peça para continuar a preparação e a elaboração do texto.";
    if (saga === "EXTRACTING") {
      title = "Peça em geração";
      description =
        "Acompanhe o texto na página da peça. A geração ainda não representa uma revisão do advogado.";
    } else if (saga === "FAILED") {
      title = "A geração precisa de atenção";
      description =
        "Abra a peça para conferir a falha. O trabalho permanece aberto; não há conclusão automática.";
    }
    if (released || preparing || filing) {
      current = "filing";
      title = "Conferir preparação e protocolo";
      description =
        "A peça avançou para a preparação. Assinatura e rascunho não significam recebimento pelo tribunal.";
    }
    if (preparation?.status === "PREPARED") {
      title = "Rascunho preparado no portal";
      description =
        "A preparação foi concluída, mas isso não é um protocolo. Confira os documentos e a situação no portal pela peça.";
    } else if (preparation?.status === "CHECK_REQUIRED") {
      title = "Preparação precisa de conferência";
      description =
        preparation.message ||
        "Abra a peça para conferir a pendência antes de continuar.";
    } else if (
      preparation?.status === "QUEUED" ||
      preparation?.status === "PREPARING"
    ) {
      title = "Preparando rascunho no portal";
      description =
        "A preparação está em andamento. Nenhum recebimento foi confirmado por esta etapa.";
    }
    if (filing) {
      const presentation = filingPresentation(filing);
      title = presentation.label;
      description = presentation.message;
    }
    if (filed) {
      current = "done";
      title = "Protocolo registrado · conferir conclusão";
      description =
        "Há um registro de protocolo da peça. Confira o comprovante e as demais obrigações antes de concluir a providência.";
    }
  } else if (!withPiece && p.status === "WORKING") {
    current = "done";
    title = "Registrar o cumprimento";
  }
  if (done) {
    current = "done";
    title = "Providência concluída";
    description =
      withPiece && !filed
        ? "O trabalho foi marcado como concluído. Esse registro, por si só, não confirma revisão nem protocolo da peça."
        : "A conclusão do trabalho está registrada. A origem e o histórico continuam disponíveis para consulta.";
  } else if (cancelled) {
    title =
      p.status === "DISMISSED"
        ? "Sugestão dispensada"
        : "Providência cancelada";
    description =
      "O fluxo está interrompido, não cumprido. Os vínculos e o histórico foram preservados.";
  } else if (!p.draft_id && p.intimation_id && p.origin_review_required) {
    current = "origin";
    title = "Confirmar tipo e prazo na origem";
    description =
      "Revise os dados da intimação antes de gerar sugestões, adicionar providências ou iniciar a elaboração da peça.";
  } else if (!p.draft_id && p.tipo_status === "a_confirmar") {
    title = "Confirmar o tipo de providência";
    description = withPiece
      ? "Revise a classificação antes de iniciar a elaboração da peça."
      : "Revise a classificação antes de iniciar o trabalho.";
  } else if (withPiece && !p.draft_id && !p.intimation_id) {
    description =
      "Esta providência não tem intimação de origem. A geração automática ainda exige esse vínculo; confira o contexto do processo.";
  }

  const state = (id: FlowStepId, recorded: boolean): FlowStepState => {
    if (recorded) return "recorded";
    if (!cancelled && current === id) return "current";
    return terminal ? "unrecorded" : "pending";
  };
  const steps: FlowStep[] = [];
  if (p.intimation_id)
    steps.push({
      id: "origin",
      label: "Origem",
      state: current === "origin" ? "current" : "recorded",
      detail:
        "Intimação vinculada. Consulte o teor e os dados da publicação sem perder o contexto deste trabalho.",
    });
  steps.push({
    id: "work",
    label: "Providência",
    state: state(
      "work",
      !["SUGGESTED", "DISMISSED"].includes(p.status) && current !== "work",
    ),
    detail:
      "Defina o trabalho, confirme seu tipo e atribua um responsável. A existência da providência não confirma todos os dados da triagem.",
  });
  if (withPiece) {
    steps.push(
      {
        id: "writing",
        label: "Elaboração",
        state: state("writing", written),
        detail: written
          ? "Minuta disponível na peça vinculada. Ela pode continuar sendo editada e revisada."
          : "Prepare os fundamentos e gere a minuta na página da peça. A geração não conclui a providência.",
      },
      {
        id: "review",
        label: "Revisão",
        state: state("review", released),
        detail: released
          ? "Há registro de encaminhamento para assinatura ou de assinatura da peça."
          : "A revisão do advogado é indispensável. Uma revisão automática da IA não equivale à aprovação humana.",
      },
      {
        id: "filing",
        label: "Protocolo",
        state: state("filing", filed),
        detail: filed
          ? "Há registro de protocolo. Consulte os dados e o comprovante na peça."
          : "Preparar um rascunho ou assinar não confirma o protocolo. Uma tentativa incerta precisa ser conferida antes de qualquer novo envio.",
      },
    );
  }
  steps.push({
    id: "done",
    label: withPiece ? "Conclusão" : "Cumprimento",
    state: state("done", done),
    detail: done
      ? "Conclusão registrada para esta providência, sem encerrar automaticamente outras obrigações do processo."
      : "Registre o cumprimento após conferir todas as obrigações. Cancelamento e dispensa não equivalem a cumprimento.",
  });
  return {
    steps,
    title,
    description,
    current,
    cancelled,
    done,
    filed,
    withPiece,
  };
}
