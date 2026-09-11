# AtJud — arquivos públicos e indexação

## Entrega

- `/llms.txt`: visão do produto em Markdown servido como texto UTF-8, com fontes públicas e limites coerentes com a LP.
- `/llm.text`: redirecionamento permanente (308) para `/llms.txt`.
- `/sitemap.xml`: somente a URL canônica `/`; não inclui login, cadastro, APIs, processos ou documentos de clientes.
- `/robots.txt`: libera a LP e os recursos necessários para renderizá-la quando há domínio definitivo configurado em build de produção. A autenticação continua sendo a proteção das áreas privadas; robots não é controle de acesso.
- `/`: URL canônica, `og:url` e diretiva de indexação alinhadas ao sitemap. As demais páginas herdam `noindex, nofollow`.

O caminho anterior `/lp` redireciona permanentemente (308) para `/`, preservando os parâmetros de consulta. `/notificacoes` é a entrada autenticada, incluindo os destinos padrão de login/cadastro e o retorno de onboarding concluído. A mudança de rota não habilita indexação da prévia.

## Domínio e build

Defina `SITE_URL` como a origem HTTPS definitiva, sem caminho, parâmetros ou fragmentos. Exemplo ilustrativo: `https://atjud.example` — esse domínio reservado não é um destino de publicação.

Os arquivos e metadados são gerados no **build**. A variável deve estar presente antes de `npm run build`; alterar somente o ambiente do processo já compilado não atualiza o material estático.

- Build direto: disponibilizar `SITE_URL` no ambiente que executa `npm run build`.
- Docker: passar o argumento de build `SITE_URL`; o Dockerfile já o recebe.
- Workflow existente: definir a variável de repositório GitHub Actions `SITE_URL`; o workflow CD já a encaminha ao build. Nenhuma variável remota foi alterada nesta tarefa.
- Recriar o build após mudar de domínio. Não usar o endereço do Cloudflare/ngrok como domínio definitivo.

Sem `SITE_URL`, a LP usa `noindex, nofollow`, robots bloqueia o rastreamento e o sitemap fica vazio. Isso permite revisar a página localmente e pelo túnel sem anunciar um endereço temporário. Em `next dev`, a indexação permanece desativada mesmo com `SITE_URL` preenchida. Os links do llms são relativos quando ainda não há domínio.

## Envio ao Google

É necessário que a LP esteja publicada no domínio definitivo e acessível sem login. O túnel desta sessão é uma prévia; este código ainda não foi publicado no domínio do produto.

1. Confirmar o domínio, publicar o build configurado e verificar que `/`, `/robots.txt`, `/sitemap.xml` e `/llms.txt` respondem publicamente.
2. Usar uma propriedade **Domínio** no Google Search Console e verificar a titularidade por DNS, ou reutilizar uma propriedade já verificada. A raiz `/` agora é a landing pública. A verificação por DNS pode ser reutilizada independentemente da rota; uma propriedade por prefixo também pode usar os métodos oferecidos pelo Search Console.
3. Na propriedade correta, enviar `/sitemap.xml` pela seção **Sitemaps**.
4. Em **Inspeção de URL**, informar a URL canônica completa da LP, testar a URL publicada e solicitar a indexação. Isso exige acesso de proprietário ou usuário completo à propriedade.
5. Acompanhar o resultado na própria ferramenta. Enviar o sitemap ou solicitar rastreamento não garante inclusão imediata nos resultados.

Não usar o antigo endpoint de ping de sitemaps; ele foi descontinuado. `llms.txt` fornece contexto para agentes e não substitui os mecanismos de descoberta e indexação do Google.

## Referências

- [Proposta llms.txt](https://llmstxt.org/)
- [Google: criar e enviar um sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: solicitar novo rastreamento](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google: interpretação de robots.txt](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google: descontinuação do ping de sitemaps](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)

## Pendência externa

O domínio definitivo e o acesso à propriedade do Search Console ainda precisam ser informados. Nenhum sitemap foi enviado ao Google e nenhuma solicitação de indexação foi feita nesta etapa local.
