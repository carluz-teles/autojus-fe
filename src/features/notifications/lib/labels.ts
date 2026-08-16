// Lista estática dos tipos de aviso conhecidos do produto, espelhando as
// constantes Type*Aviso do BE (internal/notifications/entity.go) — o GET
// /v1/notifications/preferences só devolve overrides já salvos, então esta lista é
// o que a tela de preferências reconcilia contra (um tipo sem override aparece
// aqui com o default "e-mail habilitado").
export const NOTIFICATION_TYPES: { type: string; label: string }[] = [
  { type: "member_joined", label: "Novo membro entrou no escritório" },
  { type: "import_finished", label: "Importação de processos concluída" },
  { type: "new_andamento", label: "Novo andamento processual" },
  { type: "deadline_due_soon", label: "Prazo a vencer" },
  { type: "deadline_missed", label: "Prazo vencido" },
  { type: "trial_ending_soon", label: "Período de teste terminando" },
  { type: "payment_failed", label: "Falha no pagamento da assinatura" },
];
