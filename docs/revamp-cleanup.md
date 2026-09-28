# Clean-up paralelo — Revamp Mesa de Trabalho / Intimações

Escopo: DEV de clean-up, paralelo ao DEV de revamp (ver
`/home/carluz_teles/jus-assessoria-automatizad/docs/revamp-mesa-trabalho-intimacoes.md`, seção 5 e 8).
Owned only: protótipos confirmados sem consumidor em `src/app/dev/triagem-v2` e
`src/app/dev/triagem-colapsada`, e helpers exclusivamente usados por eles. Não tocado:
`features/triagem`, `features/intimacoes`, rotas `app/(app)`, serviços/hooks/tipos
compartilhados, arquivos de pacote, testes compartilhados — propriedade do DEV revamp/fundação.

## Removidos

### 1. `src/app/dev/triagem-v2/page.tsx` (1964 linhas)

- **Classificação:** sem consumidores — protótipo dev isolado.
- **Conteúdo:** mockup "use client" autocontido (dados `SEED` locais, `useState`, sem chamada a
  BE). Todos os helpers (`RowTriar`, `GroupRow`, `BulkBar`, `TabBar`, etc.) são definidos e
  usados só dentro do próprio arquivo — nenhum export consumido por outro módulo.
- **Evidência de ausência de rota/nav:** `grep -rn "triagem-v2"` no repo (fora de
  `node_modules`/`.next`) só retorna comentários de origem em
  `src/features/triagem/components/pipeline/atoms.tsx`, `.../pipeline/menu.tsx` e
  `.../triagem-view.tsx` — citam o mockup como fonte de inspiração do código real já
  extraído/portado, não como import.
- **Gate de produção:** `src/app/dev/layout.tsx` faz `notFound()` quando
  `NODE_ENV === "production"`; a rota nunca existiu em produção.
- **Sem link de navegação:** nenhuma referência a `/dev/triagem-v2` em `href=`/string de rota
  em `src/proxy.ts`, `journey-prototype` ou `dev/ds`.
- **Testes/E2E/screenshot harness:** nenhuma ocorrência de `triagem-v2` em specs, `e2e/`,
  `playwright/` (diretórios inexistentes neste repo) ou qualquer outro arquivo de teste.
- **Imports usados:** só componentes/libs compartilhados amplamente consumidos em produção
  (`@/components/ui/badge`, `button`, `checkbox`, `input`, `tab-styles` — `tabTriggerClassName`
  também usado em `features/intimacoes/components/shared/filter-tabs.tsx` — e `@/lib/utils`).
  Nenhum helper exclusivo a inventariar além do próprio arquivo.

### 2. `src/app/dev/triagem-colapsada/page.tsx` (441 linhas)

- **Classificação:** sem consumidores — protótipo dev isolado (modelo "colapsado" de
  triagem/providência, citado em `docs/design-fulfillment-decoupling.md` como referência de
  design, não como dependência de código).
- **Conteúdo:** mockup "use client" autocontido, dados hardcoded, sem BE. Helpers
  (`TriageCard`, `IntimacaoDetalhe`, `CumprimentoAlert`, etc.) definidos e usados só no arquivo.
- **Evidência de ausência de referência:** `grep -rn "triagem-colapsada"` no repo (fora de
  `node_modules`/`.next`) não retorna nenhuma ocorrência.
- **Gate de produção e navegação:** mesmo `dev/layout.tsx`; sem `href`/rota em nenhum lugar.
- **Testes/E2E:** nenhuma ocorrência.
- **Imports usados:** só `@/components/ui/badge` e `@/components/ui/button`, compartilhados.

## Preservado (fora de escopo deste DEV)

- **`IntimacoesFeed`** (`src/features/prazos/components/acervo/intimacoes-feed.tsx`): wrapper
  ativo, consumido por `src/app/(app)/intimacoes/page.tsx`. Não é código morto — confirmado
  pelo handoff do revamp e pela busca de referências. Nenhuma alteração feita.
- **Ramo `triagem=true` de `ListagemIntimacoes`/`useListagemIntimacoes`:** candidato citado no
  handoff (seção 8) como sem consumidor ativo aparente, mas vive dentro de arquivos ativos de
  `features/intimacoes` (fundação/DEV revamp são donos). Fora do escopo autorizado deste
  clean-up paralelo — deferido para a fase de integração do plano, após o DEV revamp liberar
  esses arquivos.
- **`RowTriar` (cópia em `triagem-v2`) vs. componente real:** a versão real já foi portada para
  `src/features/triagem/components/pipeline/` (ver comentários citados acima). A remoção do
  mockup não afeta o componente ativo.

## Ferramentas

- `knip.json` existe no repo, mas não há dependência/script `knip` em `package.json` —
  inventário feito por `grep` de referências (rotas, imports, testes, docs), conforme handoff.
  Não instalada/rodada nenhuma dependência nova para esta limpeza.

## Validação

- `git status --short` no repo FE antes e depois: nenhuma outra modificação pré-existente do
  DEV de revamp foi tocada; único diff introduzido são as duas remoções acima (working tree,
  não staged/commitado).
- Checagem direcionada: nenhum arquivo do repo (excluindo os dois removidos) referencia
  `triagem-v2` ou `triagem-colapsada` por import, rota, teste ou navegação após a remoção.
- Build/lint completo não executado nesta rodada (instrução: checks direcionados apenas,
  trabalho de UI segue em paralelo; evitar conflito de build completo). Typecheck/build fica a
  cargo da fase de integração/QA do plano.

## Integração posterior

- Removido o ramo sem chamador `triagem=true` da listagem; a rota de Intimações e seu wrapper ativo foram preservados.
- Por pedido explícito, removidos `/meus-prazos`, `fila-view.tsx`, `prazos-agenda.tsx` e `intimacao-agenda-card.tsx`, além das entradas de navegação. Busca em `src` confirmou ausência de importadores residuais; componentes de prazo compartilhados foram preservados.
- Em `pipeline/atoms.tsx`, removidos `RespAvatar`, seu auxiliar `iniciais`, `PrazoBadge` e `EstadoChip`, sem consumidores. O único importador do módulo é `row-triar.tsx`, que usa `CategoriaChip`, `ExcecaoDot` e `PrazoDestaque`. Responsável já usa os componentes canônicos da organização.
- Removidos `use-preview-density.ts` e seu teste após a decisão de permitir rolagem independente do preview: os cortes de conteúdo por altura deixaram de ser necessários. O teor colapsável é compartilhado com a página de detalhe; trabalho e prazo reutilizam seus componentes existentes.
- Removido Confirmar da linha e da barra de lote da Mesa, com os handlers, hook `useConfirmarPrazosConfiaveisEmLote` e wrapper `confirmTrustedDeadlinesBatch` do frontend, cujo único consumidor era essa UI. Contratos do backend preservados.
