/** Only local lists, process and providência details are valid return destinations. */
export function retornoDaFila(value: string | null): string {
  if (!value) return "/intimacoes";
  const path = value.split("?")[0];
  return path === "/triagem" ||
    path === "/intimacoes" ||
    /^\/(?:processos|providencias)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      path,
    )
    ? value
    : "/intimacoes";
}

export function rotuloRetornoDaFila(value: string): string {
  const retorno = retornoDaFila(value);
  if (retorno.startsWith("/triagem")) return "Voltar à triagem";
  if (retorno.startsWith("/processos/")) return "Voltar ao processo";
  if (retorno.startsWith("/providencias/")) return "Voltar à providência";
  return "Voltar às intimações";
}

export function detalheNaFila(id: string, retorno: string): string {
  return `/intimacoes/${encodeURIComponent(id)}?retorno=${encodeURIComponent(retornoDaFila(retorno))}`;
}
