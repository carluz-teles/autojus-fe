// Tom do chip de status por display_status — fonte única (Regra nº1). Nasceu em
// TarefasView; a Fila/Meus Prazos (features/prazos) também precisa do mesmo
// chip para a mesma tarefa, então vive aqui (dono do conceito TaskView).
export const STATUS_PILL: Record<string, string> = {
  Aberta: "bg-muted text-muted-foreground",
  "Em execução": "bg-gold/15 text-gold",
  Concluída: "bg-primary/10 text-primary",
  Atrasada: "bg-destructive/10 text-destructive",
};
