"use client";

// FONTE ÚNICA da entrada de "Gerar peça" em toda a plataforma (triagem, detalhe da
// intimação, agenda/fila). Encapsula O FLUXO CANÔNICO da tela de intimação, com UM
// só comportamento:
//   iniciar → PecaGateModal (pre-flight: aviso de autos) → GerarPecaModal (orientação
//   opcional) → navega /pecas/nova?...&auto=1 (as instructions viajam por
//   sessionStorage, não pela URL). Peça já iniciada → abre direto ("Abrir peça").
//   Uma peça opcional usa só a intimação; se houver item anterior, ele serve
//   apenas para consultar se já existe draft vinculado antes da criação.
//
// Antes existiam 3 comportamentos divergentes (detalhe: gate+modal; triagem: só modal;
// agenda: link direto). Aqui há UMA fonte:
//   · `usePecaGeracao()` — hook que gere o gate+modais+navegação; para superfícies com
//     layout próprio (a linha da triagem tem botão inline + item de menu, ambos abrindo
//     o MESMO fluxo).
//   · `GerarPecaButton` — o botão pronto (detalhe, agenda) = usePecaGeracao + <Button>.
//
// Check 1 do gate (confirmar tipo do ato) é no-op no motor v3 (o tipo é resolvido no
// BE na geração) — por isso tipoConfirmado=true / prazo=null e o gate roda só o Check 2
// (autos). Se a confirmação de tipo voltar, muda-se AQUI, num lugar só.

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { setInstructions } from "../../lib/instructions-storage";
import { GerarPecaModal } from "./gerar-peca-modal";
import { PecaGateModal } from "./peca-gate-modal";

/** Contexto mínimo p/ gerar uma peça a partir de qualquer superfície. */
export interface PecaTarget {
  /** Intimação de origem. */
  intimacaoId: string;
  /** Processo (court_record) — usado pelo gate p/ checar autos. */
  processoId: string;
  /** Providência formal; omitida para peça opcional nascida só da intimação. */
  actionItemId?: string;
  /** Só consulta um draft já vinculado; criação opcional usa a intimação. */
  existingActionItemId?: string;
  /** Para onde a construção volta ao concluir/cancelar. */
  retorno: string;
  /** Grau do processo (recorte da busca de autos no gate). */
  degree?: string;
  /** Rótulo pt-BR da peça (títulos dos modais). */
  pecaLabel?: string;
  /** Peça já iniciada (tem draft) → abre direto, sem gate/modal. */
  jaIniciada?: boolean;
}

/** Exportada só para teste comportamental (a garantia central do fluxo
 *  canônico é `auto=1` SEMPRE presente — é o que faz a tela de construção
 *  pular direto para o loader de 4 fases, sem wizard de teses). */
export function urlDaPeca(t: PecaTarget): string {
  const providencia = t.actionItemId
    ? `providencia=${encodeURIComponent(t.actionItemId)}&`
    : "";
  const existente =
    !t.actionItemId && t.existingActionItemId
      ? `verificar_providencia=${encodeURIComponent(t.existingActionItemId)}&`
      : "";
  return `/pecas/nova?${providencia}${existente}intimacao=${encodeURIComponent(t.intimacaoId)}&auto=1&retorno=${encodeURIComponent(t.retorno)}`;
}

/**
 * Hook do fluxo canônico de geração de peça. `iniciar(target)` roda o pre-flight
 * (ou navega direto se já iniciada); `modais` é o JSX do gate+orientação (renderize
 * uma vez na superfície). Um só comportamento, reusável em qualquer layout.
 */
export function usePecaGeracao() {
  const router = useRouter();
  const [target, setTarget] = useState<PecaTarget | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function iniciar(t: PecaTarget) {
    if (!t.intimacaoId) return;
    if (t.jaIniciada) {
      router.push(urlDaPeca(t));
      return;
    }
    setTarget(t);
    setGateOpen(true);
  }

  // Gate passou (ou "Gerar mesmo assim") → modal de orientação.
  function onGatePassou() {
    setGateOpen(false);
    setModalOpen(true);
  }

  // Confirmou (com ou sem instruções) → grava as instruções (se houver) e navega.
  function onGenerate(instructions: string) {
    if (!target) return;
    if (instructions)
      setInstructions(target.actionItemId || target.intimacaoId, instructions);
    setModalOpen(false);
    router.push(urlDaPeca(target));
  }

  const modais = target ? (
    <>
      <PecaGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        intimacaoId={target.intimacaoId}
        processoId={target.processoId}
        degree={target.degree}
        prazo={null}
        tipoConfirmado
        pecaLabel={target.pecaLabel}
        onProceed={onGatePassou}
        onConfigurarTribunal={() => router.push("/configuracoes?tab=fontes")}
      />
      <GerarPecaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onGenerate={onGenerate}
        pecaLabel={target.pecaLabel}
      />
    </>
  ) : null;

  return { iniciar, modais };
}

export interface GerarPecaButtonProps extends PecaTarget {
  // Apresentação — o COMPORTAMENTO é único; só o visual se adapta à superfície.
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  /** Override do texto (default: "Gerar peça" / "Abrir peça"). */
  label?: string;
  disabled?: boolean;
}

/** Botão pronto de "Gerar peça" — para superfícies sem layout de linha próprio. */
export function GerarPecaButton({
  variant,
  size = "sm",
  className,
  label,
  disabled,
  ...target
}: GerarPecaButtonProps) {
  const { iniciar, modais } = usePecaGeracao();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || !target.intimacaoId}
        onClick={() => iniciar(target)}
      >
        <Sparkles data-icon="inline-start" />
        {label ?? (target.jaIniciada ? "Abrir peça" : "Gerar peça")}
      </Button>
      {modais}
    </>
  );
}
