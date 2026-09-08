/** Only local list routes and process details are accepted as a return destination. */
export function retornoDaFila(value: string | null): string {
  if (!value) return "/intimacoes";
  const path = value.split("?")[0];
  return path === "/triagem" ||
    path === "/intimacoes" ||
    /^\/processos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      path,
    )
    ? value
    : "/intimacoes";
}

export function detalheNaFila(id: string, retorno: string): string {
  return `/intimacoes/${encodeURIComponent(id)}?retorno=${encodeURIComponent(retornoDaFila(retorno))}`;
}
