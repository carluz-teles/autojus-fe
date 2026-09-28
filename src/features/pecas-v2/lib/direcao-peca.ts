// Rótulos do painel "Resumo" da bancada que a UI vinha AFIRMANDO errado.
// Ambos existem porque componente não declara lógica inline (CLAUDE.md FE) e
// porque a regra tem que ser testável: as duas frases já contradisseram o dado
// exibido na mesma tela.

/**
 * Texto do bloco "Direção da peça".
 *
 * `instructions` é a orientação LIVRE e OPCIONAL do advogado (o modal tem
 * "Pular", que manda ""). `title` é o objetivo da peça, confirmado na criação e
 * estampado no título da tela. Ler só `instructions` fazia o painel dizer
 * "Objetivo não confirmado nesta peça" ao lado do objetivo — a UI negando um
 * dado que ela própria exibe. A precedência é orientação → objetivo → silêncio
 * honesto sobre a ORIENTAÇÃO (nunca sobre o objetivo).
 */
export function direcaoDaPeca(
  instructions: string | undefined,
  title: string | undefined,
): string {
  const orientacao = instructions?.trim();
  if (orientacao) return orientacao;
  const objetivo = title?.trim();
  if (objetivo) return objetivo;
  return "Sem orientação específica para esta peça.";
}

/**
 * Linha de prazo da PROVIDÊNCIA (action_item.due_date) — "" quando não há
 * prazo, caso em que o chamador não rende linha alguma.
 *
 * O painel mostra dois prazos de coisas diferentes (o da intimação, no topo, e
 * o da providência, aqui). Sem dizer de quem é cada um, "Prazo: Não definido"
 * embaixo de "Prazo da intimação · 30/09/2026" é lido como defeito. Providência
 * sem prazo não rende nada: "Não definido" não informa e só gera a contradição.
 */
export function prazoProvidenciaLabel(dueDate: string | null): string {
  if (!dueDate) return "";
  // timeZone UTC: due_date é uma data de calendário; o fuso local deslocaria o dia.
  const data = new Date(dueDate).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
  return `Prazo da providência: ${data}`;
}
