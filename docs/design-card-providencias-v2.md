# Design — Card "Providências" v2 (fonte: `.dc.html` canônico, não mais mockup traduzido)

> **Origem**: extraído literalmente de `Prazos - Linear (Inbox + Pipeline).dc.html` (projeto Claude Design
> `1967aca4-a3d9-4cf7-9357-b55b78deccf4`, via DesignSync MCP), seções `_intimacaoDe()` (JS, deriva os campos) e o
> bloco HTML da renderização (`<!-- PRIMÁRIA: providências geradas pela IA -->`). **Este documento SUBSTITUI
> INTEIRAMENTE `design-card-providencias-v1.md`** — a v1/v1.1 foi minha tradução verbal de screenshots +
> simplificações pedidas ao vivo, e diverge do `.dc.html` real em vários pontos. Onde v1 e v2 conflitam, **v2
> vence** (confirmado explicitamente pelo usuário: "Follow de .dc.html exactly").
>
> O `.dc.html` é um protótipo estático (React fake, sem backend real) — os nomes de campo (`pv.txt`, `pv.selo`,
> `heranca`, etc.) são do MOCK, não do nosso schema. Este doc traduz cada campo do mock pro dado REAL do nosso
> backend (`action_item`/`intimation`/`deadline`/`task`/`draft`), e é explícito onde não há equivalente real
> exato (heurística documentada, não invenção silenciosa).
>
> **v2.1 (correção do usuário, mesma sessão)**: o breadcrumb "1·Ato / 2·Prazo / 3·Providências" (§2) foi
> removido por decisão explícita — **NÃO implementar**, mesmo estando no `.dc.html`. Tudo o mais do §2 (a linha
> de detalhe legal, "Publicação no DJEN em {data}") **permanece**, só sem a trilha de pílulas acima dela. Todo o
> resto do documento (banner §3, selo por item §4, "Como a IA leu" §6, etc.) continua valendo integralmente.

---

## Estrutura completa do card "Providências" (estado pronto, pós-análise)

```
┌─ Providências ✨  geradas pela IA · revise antes de executar         2 ─┐
│                                                                          │
│  [1 · Ato: Contestação]  ›  2 · Prazo: 15 dias úteis  ›  3 · Providências│
│  15 dias úteis · contagem em dias úteis (art. 219, CPC) · Publicação    │
│  no DJEN em 18/08                                                       │
│ ── (fundo var(--bg), levemente diferente do resto do card) ──────────── │
│  Cada providência vira uma tarefa, vinculada ao prazo que já existe    │
│  (fatal 04/09) e herdando o selo A apurar — nasce em triagem —         │
│  confirme o tipo primeiro.                          [ Criar todas ]    │
│ ──────────────────────────────────────────────────────────────────────│
│  Redigir Contestação                                                   │
│  Ato principal da intimação — exige a peça dentro do prazo (15 dias   │
│  úteis).                                                                │
│  [Peça] [●A apurar]                                    [+ Criar tarefa]│
│ ──────────────────────────────────────────────────────────────────────│
│  Juntar procuração e documentos                                        │
│  A peça depende de instrumento de mandato e documentos do cliente.    │
│  [Ciência] [fluxo curto] [●A apurar]                    [+ Criar tarefa]│
└──────────────────────────────────────────────────────────────────────┘
```

Coluna secundária (ao lado, `grid-template-columns: minmax(0,1.5fr) minmax(0,1fr)`):

```
┌─ COMO A IA LEU                                    IA · confiança 82% ─┐
│  Contestação  (serif, 16px)                                           │
│  A IA leu o teor, classificou o ato e derivou o prazo e as            │
│  providências. Confirme o tipo antes de validar.                      │
└─────────────────────────────────────────────────────────────────────┘
┌─ TEOR DA INTIMAÇÃO ────────────────────────────────────────────────────┐
│  {teor completo}                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Header (igual ao que já existe — sem mudança)

Ícone (zap/sparkles, `stroke="var(--accent)"`, 15×15) + **"Providências"** (13px, weight 600) + `sc-if` só quando
pronto: **"geradas pela IA · revise antes de executar"** (11.5px, `var(--fg3)`) + contador `{{ n }}` alinhado à
direita (mono, 11px, `var(--fg3)`).

## 2. Linha legal (SEM breadcrumb — removido por decisão explícita, ver v2.1 no topo)

~~Trilha "1·Ato / 2·Prazo / 3·Providências"~~ — **NÃO implementar**, mesmo estando no `.dc.html` original.

Bloco com `border-bottom: 1px solid var(--line2)`, padding `12px 16px`, contendo SÓ a linha de detalhe (11px,
`var(--fg3)`): `"{regra} · {termo}"`.

**Mapeamento pro dado real:**
- `{regra}`/`{termo}` = **sem equivalente real hoje** (o mock hardcoda `"art. 219, CPC"` por regex no texto da
  providência — não é dado de verdade). Heurística: mostrar só `"Publicação no DJEN em {i.published_at}"` (dado
  real) e **omitir** a parte do artigo de lei/regra de contagem até existir uma fonte real pra isso (não inventar
  citação de lei). Documentar no código que é um campo parcialmente disponível.
- Se `i.published_at` não existir, **omitir o bloco inteiro** (não mostrar uma linha vazia/"—").

## 3. Banner "Cada providência vira uma tarefa..." (RESTAURAR o texto completo)

Bloco com fundo `var(--bg)` (diferente do `var(--panel)` do card), padding `10px 16px`, border-bottom:

> "Cada providência vira uma **tarefa**, vinculada ao prazo que já existe (fatal {fatal}) e herdando o selo
> **{selo}** — nasce em **{nasce}**."

~~+ botão **"Criar todas"**~~ — **[REMOVIDO, correção do usuário]**. Não mostrar esse botão em lugar nenhum; a
única forma de criar tarefa é o "+ Criar tarefa" por linha (§4). Remover também o `useCriarTodas`/handler
associado se ficar órfão.

**Mapeamento:**
- `{fatal}` = `i.prazo.end_date` formatada, se existir; se não houver prazo, reescrever a frase sem essa cláusula
  (ex.: "Cada providência vira uma **tarefa** — confirme antes de criar.") em vez de mostrar "fatal —".
- `{selo}`/`{nasce}` no BANNER (não confundir com o selo POR ITEM do §5): no mock é um valor único pro lote
  inteiro. **Decisão**: como nosso backend tem `tipo_status` por item (não por lote), o banner usa o selo do pior
  caso do lote — se QUALQUER item ainda for `a_confirmar`, o banner mostra `"A apurar"`/`"triagem — confirme o
  tipo primeiro"`; se todos os itens visíveis já forem `confiavel`, mostra `"Confiável"`/`"A fazer"`. Isso é uma
  extensão razoável do mock pro nosso modelo mais rico, não uma invenção arbitrária — documentar no código.

## 4. Lista de providências — cada linha

Grid `1fr auto`, padding `12px 16px`, border-bottom `var(--line2)`, hover (`.row-hover`). **Sem ícone/círculo à
esquerda do título** — o `.dc.html` não tem uma coluna de ícone antes do texto, a linha começa direto no título
(`span` dentro do primeiro `1fr`). **[Correção do usuário — cleanup]**: existe um `CircleDashed`/`Square` (ícone
de círculo pontilhado) herdado da versão PRÉ-costura do componente (`SUGGESTED`/`APPROVED`) que nunca foi removido
— remover esse ícone completamente, não é parte do design atual em nenhum estado.

**Coluna esquerda:**
1. `{{ pv.txt }}` — título, 13px, weight 500.
2. `{{ pv.fonte }}` — descrição, 11.5px, `var(--fg3)`, margin-top 3px. **[BUG CONHECIDO — corrigir]**: hoje não
   aparece. Fonte do dado: candidato efêmero da análise (`IntimacaoAnaliseCandidate`, cacheado por `tipo` — já
   existe esse mecanismo no código, `candidatoPorTipo`) — **debugar por que não está chegando/renderizando**, não
   reescrever do zero se a lógica já existe.
3. Badges (`display:inline-flex; gap:6px; margin-top:8px`):
   - `{{ pv.tipo }}` — **"Peça"** com `color: var(--gold)` / `background: color-mix(in oklch, var(--gold) 12%, transparent)` **(NÃO é azul — corrigir se eu tinha posto azul)**, OU **"Ciência"** com `color: var(--fg3)` / fundo cinza.
   - SE `pv.fluxoCurto` (= `!gera_peca`): badge **"fluxo curto"** (fundo `var(--hover)`, `var(--fg3)`).
   - Badge **selo por item** (RESTAURAR — eu tinha removido): dot colorido (5×5px, `border-radius:50%`) + texto,
     `background: {{ seloFundo }}`, `color: {{ seloCor }}`. Mapeia DIRETO do nosso `action_item.tipo_status`:
     `tipo_status="a_confirmar"` → `"A apurar"` / `var(--gold)`; `tipo_status="confiavel"` → `"Confiável"` /
     `var(--green)`. **Aqui é POR ITEM de verdade** (nosso dado é mais rico que o mock — cada action_item tem seu
     próprio tipo_status, diferente do banner do §3 que é agregado).
   - SE `task_id` presente: badge verde com check + `{{ tarefaId }}` (reusar `codigoTarefa`, prefixo `"T-"` já
     ajustado numa fatia anterior).

**Coluna direita (ação):**
- SE `task_id` ausente: botão **"+ Criar tarefa"** (outline, `var(--line)` border, `var(--panel)` bg) — chama
  `confirmar` (mesmo endpoint de sempre; idempotente pra item já declarado). **SEM botão de Descartar** — o
  `.dc.html` não tem essa ação nesta view. Remover o botão "Descartar" que eu tinha adicionado (a função/hook
  `useDescartarActionItem` pode continuar existindo no service layer, só não renderizar aqui).
- SE `task_id` presente:
  - SE `gera_peca`: botão **"Gerar minuta"** (borda `color-mix(in oklch, var(--accent) 45%, transparent)`, fundo
    `color-mix(in oklch, var(--accent) 7%, transparent)`, texto `var(--accent)`) — chama `criarPeca({task_id})`
    (já implementado).
  - SE `!gera_peca` (Ciência): texto simples **"no fluxo"** (`var(--fg3)`, sem botão) — **RESTAURAR**, eu tinha
    removido.

## 5. Estrutural: "Gerar minuta" é POR LINHA, não um card separado

O `.dc.html` NÃO tem um card "Minuta" separado abaixo da lista — a ação de gerar peça mora dentro da própria
linha da providência (§4, coluna direita, quando `criada && ehPeca`). **Remover** o card persistente "Minuta —
{tipo} / Ainda não gerada / Gerar peça / Gerado em.. / Gerar novamente" que veio do merge com origin/main (era
uma estrutura diferente, de outra fatia) — a ação de gerar peça agora vive só na linha do item Peça, como o
`.dc.html` mostra. Se já existir uma peça gerada pra essa task (`draft` já existe), o clique em "Gerar minuta"
deve navegar direto pra ela (o backend já é idempotente por `task_id` — `POST /v1/pecas {task_id}` retorna o
draft existente sem duplicar).

## 6. Coluna secundária: "Como a IA leu" e "Análise" são O MESMO CARD (correção do usuário)

**Não criar um card novo separado.** O card "Análise" que já existe (mostra `ai_summary`) e o "Como a IA leu" do
`.dc.html` cobrem a mesma informação (a leitura da IA sobre a intimação) — **fundir os dois num card só**, reusando
o card "Análise" já existente e ENRIQUECENDO-O com os elementos visuais do `.dc.html`:

Bloco com borda/fundo accent (`border: 1px solid color-mix(in oklch, var(--accent) 26%, transparent)`,
`background: color-mix(in oklch, var(--accent) 5%, transparent)`, padding `14px 16px`) — substitui o estilo atual
do card "Análise":

- Linha: label uppercase **"COMO A IA LEU"** (11px, weight 600, `letter-spacing:.03em`, `var(--accent)`) — troca o
  label "Análise" atual por este — + à direita `{{ atoConf }}` (mono, 10.5px, `var(--fg3)`, ver heurística abaixo).
- `{{ ato }}` — serif, 16px, margin `8px 0 4px` (`intimation.ai_act`).
- O texto do card passa a ser o `ai_summary` REAL (o que já é mostrado hoje no card "Análise") — **não** o texto
  fixo genérico do mock ("A IA leu o teor, classificou..."). O texto fixo do mock era só placeholder de protótipo;
  o dado real (`ai_summary`) é estritamente melhor e já existe — usá-lo no lugar.

**Mapeamento:**
- `{ato}` = `intimation.ai_act`.
- `{atoConf}` = **sem equivalente real exato** — heurística: se TODOS os action_items forem
  `tipo_origem="declarado"` → `"Declarado na intimação"` (`var(--green)`); se ALGUM for `"ia"` → `"IA · confiança
  {média das confianças}%"` (`var(--accent)`, calcular a média das `confianca` dos itens `tipo_origem=ia`,
  arredondado); sem terceiro caso "divergente" por enquanto (conceito do Motor de Prazos pro PRAZO, não pro Ato).
  Documentar a heurística no código.

## 7. O que fica igual (não mudar)

- "Teor da intimação" (card já existe, bate com o mock).
- Trilha/histórico embaixo (já existe).
- Polling assíncrono enquanto a tarefa nasce (mecanismo já implementado antes deste doc, continua válido).

## 8. Resumo do que fazer

1. ~~Restaurar breadcrumb~~ **NÃO fazer — removido por decisão explícita (v2.1).**
2. Adicionar a linha de detalhe legal (best-effort: só "Publicação no DJEN em {data}" por ora), SEM breadcrumb acima dela.
3. Restaurar o texto completo do banner + `{selo}`/`{nasce}` agregado do lote.
4. Corrigir o bug da descrição ausente por item.
5. Corrigir a cor do badge "Peça" pra `var(--gold)` (não azul).
6. Restaurar o selo por item (dot + "A apurar"/"Confiável", de `tipo_status` real).
7. Remover o botão "Descartar" da linha (manter o hook/service, só não renderizar).
8. Restaurar o texto "no fluxo" pros itens Ciência já com tarefa.
9. Mover "Gerar minuta" pra dentro da linha (coluna direita, quando `criada && gera_peca`); remover o card
   "Minuta" separado que veio do merge com origin/main.
10. **NÃO criar um card novo** "Como a IA leu" — fundir com o card "Análise" já existente (mesmo card, estilo
    accent do `.dc.html` + `ai_summary` real como corpo de texto, ver §6 corrigido).
