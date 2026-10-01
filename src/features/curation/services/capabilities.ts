const labels: Record<string, string> = {
  "curation.read_status": "Consultar configuração",
  "curation.read_priorities": "Consultar prioridades",
  "curation.read_provider_status": "Consultar fontes",
  "curation.read": "Consultar curadoria",
  "curation.author": "Editar rubricas e teses",
  "curation.admit": "Admitir casos",
  "curation.judge": "Revisar teses",
  "curation.annotate": "Anotar intimações",
  "curation.predict": "Gerar sugestões",
  "curation.decide": "Decidir revisões",
  "curation.publish": "Publicar conjuntos revisados",
  "curation.train": "Gerenciar treinamento",
  "curation.manage": "Gerenciar protocolos e lotes",
};

export function capabilityLabel(capability: string) {
  return labels[capability] ?? capability;
}
