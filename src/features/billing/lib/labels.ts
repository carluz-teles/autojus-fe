import type { StatusTone } from "@/components/ui/status-badge";

import type { Subscription } from "../types";

// Rótulos/tons pt-BR do status de assinatura (Subscription.status) — fonte
// única pra StatusBadge na aba Plano & cobrança (Fase 3).

const STATUS_LABEL: Record<Subscription["status"], string> = {
  trialing: "Em teste",
  active: "Ativo",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
};

/** past_due é o único status que exige ação do usuário (cartão falhou) —
 * warning, nunca neutro, pra não passar despercebido. canceled some da lista
 * (a tela cai de volta pro catálogo), mas o rótulo/tom existe pro instante
 * antes do refetch resolver isso. */
const STATUS_TONE: Record<Subscription["status"], StatusTone> = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
};

export function subscriptionStatusLabel(
  status: Subscription["status"],
): string {
  return STATUS_LABEL[status];
}

export function subscriptionStatusTone(
  status: Subscription["status"],
): StatusTone {
  return STATUS_TONE[status];
}
