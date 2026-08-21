// Lista estática dos tipos de aviso conhecidos do produto, espelhando as
// constantes Type*Aviso do BE (internal/notifications/entity.go) — o GET
// /v1/notifications/preferences só devolve overrides já salvos, então esta lista é
// o que a tela de preferências reconcilia contra (um tipo sem override aparece
// aqui com default = todos os canais habilitados).
export const NOTIFICATION_TYPES: { type: string; label: string }[] = [
  { type: "import_finished", label: "Importação concluída" },
  { type: "new_andamento", label: "Novo andamento" },
  { type: "deadline_due_soon", label: "Prazo a vencer" },
  { type: "deadline_missed", label: "Prazo perdido" },
  { type: "trial_ending_soon", label: "Período de teste acabando" },
  { type: "payment_failed", label: "Falha no pagamento" },
  { type: "member_joined", label: "Novo membro no escritório" },
];
