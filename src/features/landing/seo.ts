/** Public origin is explicitly configured; never derive canonical URLs from a tunnel or request Host. */
export function getLandingSite() {
  const configured = process.env.SITE_URL?.trim();
  if (!configured) return { origin: null, canonical: null, indexable: false };

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("SITE_URL deve ser a origem HTTPS do domínio definitivo.");
  }

  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.includes(".") ||
    /(^|\.)(localhost|trycloudflare\.com|ngrok-free\.app|ngrok-free\.dev|ngrok\.io)$/.test(
      url.hostname,
    ) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)
  ) {
    throw new Error(
      "SITE_URL deve conter apenas a origem HTTPS do domínio definitivo, sem caminho, parâmetros ou endereço de túnel.",
    );
  }

  return {
    origin: url.origin,
    canonical: `${url.origin}/`,
    indexable: process.env.NODE_ENV === "production",
  };
}

export function getLlmsText() {
  const { origin } = getLandingSite();
  const page = `${origin ?? ""}/`;

  return `# AtJud

> Plataforma de assessoria jurídica para escritórios brasileiros. Centraliza processos, intimações, movimentações e autos; gera providências automáticas e auxilia na redação e revisão de minutas com contexto e fontes.

A captura diária acompanha as OABs cadastradas nas fontes monitoradas. DJEN fornece publicações e DataJud complementa dados e histórico processual. Autos são importados pelas conexões de tribunal disponíveis e podem exigir autenticação.

A análise do teor e do histórico distingue mera ciência, necessidade de atuação e cumprimento identificado. As minutas usam o contexto disponível, teses selecionadas e perfis de peça. O chat resume documentos e processos, esclarece o teor, sugere melhorias e ajusta o tom para objetivo, técnico ou enfático.

Referências permitem conferir documento, página e trecho. A cobertura depende dos documentos disponíveis; lacunas exigem verificação. Alterações propostas precisam da aprovação do advogado. Não há promessa de infalibilidade jurídica ou tempo fixo de resposta.

A preparação atual reúne petição, anexos e dados em um rascunho no e-SAJ/TJSP. Assinatura e protocolo definitivo estão em implantação. A personalização automática pela voz do escritório e o aprendizado com resultados são evoluções previstas. Os avisos atuais incluem importação, prazos e atribuições; não há notificação individual de cada atualização recebida pela ingestão.

Os exemplos da landing page são fictícios. As áreas de processos, autos e documentos de clientes exigem autenticação e não fazem parte deste conteúdo público.

## Produto

- [Landing page do AtJud](${page}): Apresentação pública e demonstrações ilustrativas do produto.
- [Captura diária e acervo centralizado](${page}#acervo): Novos processos, intimações, movimentações e autos no mesmo contexto.
- [Providências automáticas](${page}#plataforma): Triagem de ciência, atuação necessária e cumprimento identificado.
- [Minutas inteligentes](${page}#inteligencia): Construção de peças com contexto, estrutura e fundamentos verificáveis.
- [Chat jurídico](${page}#assistente): Resumos, assistência, revisão e ajustes de tom com fontes.
- [Preparação para o tribunal](${page}#protocolo): Petição, anexos e dados; disponibilidade da integração e do protocolo.

## Dúvidas e disponibilidade

- [Perguntas frequentes](${page}#duvidas): Credenciais, fontes, avisos, prazos, cobertura documental e funcionalidades em implantação.
`;
}
