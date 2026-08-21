// Aceita tanto o Processo (mock) quanto o ProcessoView (real) — o cockpit passou
// a usar ProcessoView; o campo usado é apenas `lifecycle`/`situacao`, que ambas
// as interfaces expõem.
export type ProcessoParaRisco = { lifecycle?: string; situacao?: string };

export type NivelRisco = "Crítico" | "Atenção" | "Baixo";

export interface Risco {
  nivel: NivelRisco;
  cor: string;
  fundo: string;
  motivos: string[];
}

/**
 * Risco determinístico — mesma entrada, mesma saída, motivos explicáveis.
 * Prazo vencido ou prazo curto sem providência em andamento = crítico.
 */
export function calcularRisco(
  processo: ProcessoParaRisco,
  dadosPrazo: { dias: number | null; providenciasAbertas: number },
): Risco {
  const { dias, providenciasAbertas } = dadosPrazo;
  const motivos: string[] = [];

  let nivel: NivelRisco = "Baixo";

  if (dias !== null && dias < 0) {
    nivel = "Crítico";
    motivos.push(
      `Prazo vencido há ${Math.abs(dias)} dia(s) e ainda em aberto.`,
    );
  } else if (dias !== null && dias <= 3 && providenciasAbertas === 0) {
    nivel = "Crítico";
    motivos.push(
      `Prazo vence em ${dias} dia(s) e nenhuma providência está em andamento.`,
    );
  } else if (dias !== null && dias <= 7) {
    nivel = "Atenção";
    motivos.push(`Prazo próximo: vence em ${dias} dia(s).`);
  }

  if (providenciasAbertas > 0) {
    motivos.push(
      `${providenciasAbertas} providência(s) em aberto vinculada(s) ao prazo.`,
    );
  }

  // ProcessoView usa `lifecycle` (SUSPENDED); mock Processo usa `situacao` ("Suspenso").
  const isSuspenso =
    processo.lifecycle === "SUSPENDED" || processo.situacao === "Suspenso";
  if (isSuspenso) {
    motivos.push("Processo suspenso — confira a causa da suspensão.");
  }

  if (motivos.length === 0) {
    motivos.push("Sem prazos vencidos ou intimações pendentes.");
  }

  const cores: Record<NivelRisco, [string, string]> = {
    Crítico: [
      "var(--destructive)",
      "color-mix(in oklch, var(--destructive) 10%, transparent)",
    ],
    Atenção: [
      "var(--gold)",
      "color-mix(in oklch, var(--gold) 14%, transparent)",
    ],
    Baixo: [
      "var(--success)",
      "color-mix(in oklch, var(--success) 12%, transparent)",
    ],
  };

  return { nivel, cor: cores[nivel][0], fundo: cores[nivel][1], motivos };
}
