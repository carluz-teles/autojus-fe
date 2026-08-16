# PM Brief — Redesenho da Tabela de Processos

**Status:** Draft | **Owner:** PM | **Stack:** Next 16 / App Router / TS / Tailwind v4 / shadcn
**Arquitetura vigente:** service → hook → component (estrito), TanStack Query para server-state
**Fonte de verdade:** ERD Frontend (Notion)

---

## 1. OBJECTIVE

Substituir a abordagem baseada em _cards_ (KpiRow de 5 lifecycle) da tela `/processos` por
**navegação por abas** (uma por status de lifecycle), e ampliar a DataTable com **split da coluna
"Processo"** (short-id + CNJ + tipo) e uma nova coluna **"Prazo a vencer"**. Acoplar **filtros
por coluna** (Órgão Julgador, Valor da causa, outros) e manter a arquitetura service → hook →
component sem regressões.

### Escopo

| Incluído                                               | Excluído                                           |
| ------------------------------------------------------ | -------------------------------------------------- |
| Abas de lifecycle (substituem os cards)                | Redesign do cockpit de detalhe (`/processos/[id]`) |
| Colunas: short-id, CNJ, tipo, prazo a vencer           | Backend — apenas levantamento de gaps              |
| Filtros por Órgão Julgador e Valor da causa na toolbar | Integração com exportação CSV                      |
| Badge de contagem nas abas                             | Nova feature de atribuição em massa                |

---

## 2. USER_GOAL

> **Como** advogado da assessoria, **quero** ver meus processos organizados por situação
> (abas) e identificar rapidamente o prazo a vencer de cada um, **para** priorizar a
> movimentação diária sem perder tempo trocando de tela ou calculando diferenças.

**Fluxo atual (6 passos):** abre página → vê 5 cards → clica num card → scrolling → encontra
processo → clica na linha → abre processo → vê aba "Prazos".

**Fluxo esperado (3 passos):** abre página → seleciona a aba "Em andamento" → vê a coluna
"Prazo a vencer" já na lista → clica na linha → abre processo.

---

## 3. REQUIREMENTS

### 3.1 Abas de lifecycle (substitui KpiRow)

| Aba          | Lifecycle value | Label        | Tone    | Badge    |
| ------------ | --------------- | ------------ | ------- | -------- |
| Todos        | `null`          | Total        | neutral | —        |
| Em andamento | `ACTIVE`        | Em andamento | info    | contagem |
| Suspensos    | `SUSPENDED`     | Suspensos    | warning | contagem |
| Arquivados   | `ARCHIVED`      | Arquivados   | neutral | contagem |
| Baixados     | `CLOSED`        | Baixados     | neutral | contagem |

- A aba ativa filtra a lista via `?lifecycle=` (server-side, mesmo mecanismo atual).
- Badge mostra a contagem daquele lifecycle (do `useProcessosSummary`).
- Aba "Total" limpa o filtro (`setLifecycle(null)`).
- Persistir estado da aba ativa via URL (`?lifecycle=ACTIVE`) — deep link compartilhável.
  - **Decisão:** usar `useSearchParams` / ` useRouter` do Next; não gravar em storage.

### 3.2 Colunas da DataTable

| #   | Header             | Key (ProcessoView)   | Derivação                                           |
| --- | ------------------ | -------------------- | --------------------------------------------------- |
| 1   | **Nº** (short-id)  | `case_id` ou `id`    | helper `shortId()` (ver 4.2)                        |
| 2   | **Processo** (CNJ) | `cnj_number`         | exibição direta, `tabular-nums`                     |
| 3   | **Tipo**           | `class` + `subject`  | `[class, subject].filter(Boolean).join(" · ")`      |
| 4   | **Órgão julgador** | `judging_body`       | exibição direta                                     |
| 5   | **Distribuição**   | `filed_at`           | `formatDate()`                                      |
| 6   | **Valor da causa** | `claim_value`        | `formatClaimValueBRL()`                             |
| 7   | **Prazo a vencer** | _derivado_           | próximo prazo vivo (ver 3.3)                        |
| 8   | **Responsável**    | `assigned_user_name` | exibição direta                                     |
| 9   | **Status**         | `lifecycle`          | `StatusBadge` via `lifecycleLabel` + `processoTone` |

- **Remover** coluna "Cliente" (placeholder `—` — não existe no backend).
- A coluna **Status** mantém-se como 1ª coluna da nova configuração ou como última? **Decisão:**
  status continua como última coluna para não quebrar o padrão visual do ponto de cor à esquerda
  (DataTable já tem `statusTone` que pinta o ponto à esquerda da linha).
- A coluna "Processo" virou 3 colunas distintas; o link/click na linha continua em `onRowClick`.

### 3.3 Coluna "Prazo a vencer"

- Mostra o **prazo vivo mais próximo** (status OPEN/PENDING, menor `days_left`) do processo.
- Exibição: `"Hoje" | "N dias" | "N dias em atraso"` + data de vencimento em pt-BR.
- Cor: `destructive` (vencido/atrasado), `gold` (≤ 3 dias), `foreground` (demais vivos),
  `muted` (sem prazo).
- **Critério de prazo vivo:** status ∈ {OPEN, PENDING} (mesmo `LIVE_STATUS` de
  `usePrazosDoProcesso`).

### 3.4 Filtros por coluna na FilterToolbar

- **Orgão Julgador:** select com opções únicas de `judging_body` (lazy-loaded do próprio
  `data` da lista ou lista estática do BE).
- **Valor da causa:** range slider / dois inputs numéricos (mínimo × máximo).
- **Contagem de filtros ativos:** badge no botão "Filtros" (já suportado pelo FilterToolbar).
- Botão "Filtros" abre um dropdown/modal com os selects + botão "Limpar tudo".

---

## 4. UX_EXPECTATIONS

### 4.1 Navegação por abas

- As abas ficam **acima** da FilterToolbar, fixas no scroll horizontal da tabela.
- Persistência de aba via `?lifecycle=` no URL — refresh mantém o estado.
- Badge com contagem na aba: `Em andamento (42)`.
- Transição suave entre abas (React Query `keepPreviousData` já suportado pelo hook).
- No mobile: abas em scroll horizontal (`overflow-x-auto`), min-height para touch (44px).

### 4.2 Derivação do short-id

Padrão já existente em `intimacoes/page.tsx:39`:

```ts
function shortId(id: string): string {
  const head = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return head || "—";
}
```

- Aplicar o mesmo helper para `case_id` (se preenchido) ou cair para `id`.
- Exibição: chip `font-mono text-xs` com `bg-muted/60`.
- Title/hint com o `case_id` completo para acessibilidade.

### 4.3 Coluna "Prazo a vencer" — micro-interações

- Hover na linha: prazo fica em negrito / destaque sutil.
- Tooltip (`title`) com texto completo: "Prazo: Contestação — vence em 5 dias (12/08/2025)".
- Sem prazo: `—` em `text-muted-foreground`.

### 4.4 Filtros

- `filterSlot` do FilterToolbar injeta chips/selects inline.
- Estado de filtro é controlado pelo hook `useProcessos` (via TanStack Query — server-side
  quando o BE suportar; client-side como fallback — ver seção 6).
- "Limpar turias" reseta todos os filtros e volta para a aba "Todos".

---

## 5. UI_EXPECTATIONS

### 5.1 Tokens do design system "Ledger"

| Elemento         | Token atual                    | Uso previsto              |
| ---------------- | ------------------------------ | ------------------------- |
| Gold accent      | `text-gold` / `bg-gold/[0.04]` | aba ativa, prazo urgente  |
| Fonte de dados   | `tabular-nums`                 | CNJ, prazos, valores      |
| Fonte de display | `font-display` (Fraunces)      | counts de KPI             |
| Surface          | `bg-card` + `ring-1 shadow-sm` | tabela (já no DataTable)  |
| Radius           | `rounded-xl`                   | tabela; `rounded-lg` tabs |

### 5.2 Estrutura visual esperada

```
[PageHeader: "Processos"]
[ImportBanner]

[Tabs: Total(99)  Em andamento(42)  Suspensos(5)  Arquivados(12)  Baixados(3)]
  └ grid-cols-5 fluido, scrollable mobile, pills with badge

[FilterToolbar — search + filterSlot(selects) + Botão "Filtros" badge(2) + Ações]

[DataTable — 9 colunas]
  │ short-id │ Processo(CNJ) │ Tipo │ Órgão julgador │ Distribuição │
  │ Valor causa │ Prazo a vencer │ Responsável │ Status │  (ação kebab)
  └ coluna status → ponto à esquerda (statusTone = processoTone)

[ListPagination: itens/página | Página N | ‹ Anterior/Próxima ›]
```

### 5.3 Estados

- **Loading:** `DataTable` mostra `loadingLabel="Carregando processos…"` nativo.
- **Empty:** mensagem contextual — `"Nenhum processo em andamento."` (não genérica).
- **Error:** `text-destructive` inline no rodapé da tabela.
- **Empty filter result:** `"Nenhum resultado para os filtros aplicados."` com botão "Limpar".

---

## 6. ACCESSIBILITY_EXPECTATIONS

1. **Tabs** (`src/components/ui/tabs.tsx`): já implementadas com `role="tablist"`, roving
   `tabindex` e teclas de seta. **Reutilizar sem modificação.**
2. **Abas:** `aria-selected` no trigger ativo, `aria-controls` apontando para o painel.
   `aria-label="Filtrar processos por situação"` no `TabsList`.
3. **Badge de contagem:** `aria-label="Em andamento, 42 processos"` (não apenas visual).
4. **Coluna prazo a vencer:** `aria-label` com texto "Prazo vence em 5 dias" quando houver;
   `—` com `aria-label="Sem prazo"`.
5. **Filtros:** cada `select` com `label` associado (`<label htmlFor>`); botão "Limpar tudo"
   com `aria-label`.
6. **Tabela:** cabeçalho `<th scope="col">`; linha com `onClick` tem `role="button"` implícito
   via `cursor-pointer`; foco visível com `focus-within:ring-2`.
7. **Contrast:** gold (#D4AF37 oklch) sobre `bg-card` → verificar 4.5:1 (usar
   `contrast-checker`).
8. **Keyboard:** Tab navega entre abas → filtros → tabela → paginação; Enter na linha abre
   o processo.

---

## 7. EDGE_CASES

| #   | Cenário                                 | Comportamento esperado                                               |
| --- | --------------------------------------- | -------------------------------------------------------------------- |
| E1  | Processo sem prazo derivado             | Coluna "Prazo a vencer" mostra `—`                                   |
| E2  | Prazo vencido (days_left < 0)           | `text-destructive` + "N dias em atraso"                              |
| E3  | Prazo vence hoje (days_left = 0)        | `"Hoje"` em `text-gold` (urgent)                                     |
| E4  | `claim_value` null                      | `—`                                                                  |
| E5  | `case_id` vazio                         | `shortId` deriva de `id`                                             |
| E6  | `judging_body` vazio                    | `—`                                                                  |
| E7  | Busca + aba ativa simultaneamente       | Ambos filtros combinam (query key inclui os dois)                    |
| E8  | Mudança de página enquanto busca digita | Debounce de 400ms já no hook (`useDebounce`)                         |
| E9  | Backend retorna lifecycle não mapeado   | `lifecycleLabel` faz fallback `humanize()`                           |
| E10 | Tela de carregamento no mobile          | `KpiCard` skeleton já existe (`CockpitSkeleton`) — adaptar para tabs |
| E11 | Lista vazia em aba específica           | Mensagem contextual: "Nenhum processo arquivado."                    |
| E12 | `assigned_user_name` null               | `—`                                                                  |

---

## 8. ACCEPTANCE_CRITERIA

| ID    | Critério                                                     | Como validar                                               |
| ----- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| AC-1  | Abas de lifecycle substituem os KpiCards clicáveis           | Visual: não há mais cards; há pills de aba acima da tabela |
| AC-2  | Badge de contagem nas abas reflete `useProcessosSummary`     | Aba "Em andamento" mostra `(42)` sincronizado              |
| AC-3  | Click na aba "Total" limpa o filtro lifecycle                | Query key `?lifecycle=` desaparece, lista mostra tudo      |
| AC-4  | URL reflete a aba ativa (`?lifecycle=ACTIVE`)                | Refresh mantém aba selecionada                             |
| AC-5  | Coluna "Processo" split em 3: short-id, CNJ, tipo            | Tabela tem 9 colunas; short-id é chip monoespaçado         |
| AC-6  | short-id deriva de `case_id` (fallback `id`), 6 chars upper  | Consistência com `intimacoes/page.tsx:39`                  |
| AC-7  | Nova coluna "Prazo a vencer" mostra contagem regressiva      | Exibe "Hoje" / "5 dias" / "2 dias em atraso"               |
| AC-8  | Prazo vencido tem cor `destructive`                          | Teste via mock de `days_left = -3`                         |
| AC-9  | Prazo ≤ 3 dias tem cor `gold` (urgent)                       | Teste via mock de `days_left = 2`                          |
| AC-10 | Filtro "Órgão julgador" funciona                             | Select filtra a lista                                      |
| AC-11 | Filtro "Valor da causa" (range) funciona                     | Inputs min/max filtram                                     |
| AC-12 | Badge "Filtros" conta filtros ativos                         | 2 selects preenchidos → badge(2)                           |
| AC-13 | "Limpar tudo" zera todos os filtros e volta para aba "Total" |                                                            |
| AC-14 | Tabela responsiva: scroll horizontal em mobile               | `overflow-x-auto` wrap (já no DataTable)                   |
| AC-15 | Acessibilidade: teclas de seta navegam entre abas            | Tabs component já testado                                  |
| AC-16 | Build + lint + typecheck passam                              | `npm run lint && npm run build`                            |

---

## 9. AMBIGUITIES (para Architect)

### (a) Dados de prazo na listagem

**Fato atual:** `GET /v1/processos` retorna `ProcessoView` — **não inclui prazos**. O endpoint
`GET /v1/processos/:id/prazos` existe, mas é por-processo (detalhe).

**Pergunta A1:** _Devemos fazer N+1 client-side (fetch prazos para cada linha visível) ou pedir
ao backend um campo agregado na lista?_

- **Opção A (recomendado):** Pedir ao BE um campo `next_deadline: { end_date, days_left, kind }
| null` embarcado no `ProcessoView` da lista. Evita N+1 e mantém paginação server-side.
- **Opção B:** Fetch client-side de prazos para as linhas visíveis (até 100). Rápido de
  implementar (hook paralelo), mas N requests por página — não escala e invalida cache de
  prazos ao navegar entre abas.

> **Recomendação PM:** Propor Opção A ao backend. Enquanto não disponível, placeholder `—`
> com `aria-label="Sem prazo"` até o BE entregar.

### (b) Derivação de short-id

**Fato atual:** `ProcessoView` tem `id: string` e `case_id: string`. O `case_id` não é
referenciado em nenhuma tela atual — a UI navega por `id`.

**Pergunta B1:** _`short-id` deve partir de `case_id` ou de `id`?_

- `case_id` é o identificador interno do sistema (provavelmente UUID). Pode estar vazio.
- `id` é o mesmo UUID. Já existe o helper `shortId()` em `intimacoes/page.tsx` derivando de
  `id`.

> **Recomendação PM:** Usar `case_id` quando não vazio; fallback para `id`. Extrair `shortId`
> para `@/lib` (único lugar — Regra nº1 de helpers) e reutilizar em `intimacoes` também.

### (c) Filtros server-side vs client-side

**Fato atual:** `useProcessos` faz busca + lifecycle **server-side** (query key inclui ambos;
`useCursorPagination` reseta ao mudar). Nenhum outro filtro existe no BE.

**Pergunta C1:** _Devemos os novos filtros (Orgão julgador, Valor da causa) ser server-side ou
client-side?_

- **Server-side:** requer novos query params (`?judging_body=`, `?claim_value_min=`,
  `?claim_value_max=`) no BE. Ideal para grandes volumes, mantém consistência com busca+cursor.
- **Client-side:** filter local dentro da página atual — mas paginação server-side significa
  que filtrar localmente perde linhas das outras páginas. Falso negativo silencioso.

> **Recomendação PM:** Propor ao backend os novos query params (server-side). Enquanto isso,
> implementar o filtro apenas client-side como _MVP_ com aviso toast:
> "Filtro local: apenas esta página" — evita surpresa quando a aba mudar.

---

## 10. DESIGN_DECISONS

| #   | Decisão                                                          | Justificativa                                                                    |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| D1  | Tabs substituem KpiRow, não coexistem                            | Evita dupla UI de lifecycle; reduce clutter; requisito explícito                 |
| D2  | Reusar `Tabs` de `@/components/ui/tabs.tsx`                      | Headless, acessível, estilo "pills" já definido                                  |
| D3  | Aba "Total" = `lifecycle=null` (limpa filtro)                    | Semântica "sem restrição" — usuário vê tudo                                      |
| D4  | short-id derivado de `case_id`                                   |                                                                                  | `id` | Fallback robusto; extrai helper reusável |
| D5  | short-id: 6 chars hex upper (drop hyphens)                       | Consistência com `intimacoes/page.tsx:39`; visível mas sem revelar UUID completo |
| D6  | `statusTone` na linha continua (ponto à esquerda)                | DataTable já suporta; não quebra padrão visual                                   |
| D7  | Prazo a vencer: derivado de `PrazoView` filtrado por status vivo | Mesma lógica de `usePrazosDoProcesso`; consistente com cockpit                   |
| D8  | Badge de contagem nas abas vem de `useProcessosSummary`          | Não refaz request por aba; summary já entrega totais por status                  |
| D9  | Filtros server-side como target; cliente como fallback           | Arquitetura cursor-pagination exige server-side para não perder pages            |
| D10 | URL `?lifecycle=ACTIVE` persiste aba                             | Deep link / compartilhamento; refresh não perde estado                           |
| D11 | Coluna "Cliente" removida                                        | Não existe no `ProcessoView`; placeholder que ocupa espaço                       |

---

## 11. PLANO DE IMPLEMENTAÇÃO (alto nível — para DEV)

### Sprint 1: Abas + reestruturação

1. **`@features/processos/hooks/use-processos.ts`** — adicionar `lifecycle` já existe; expor
   `setLifecycleFromUrl` via `useSearchParams` sync.
2. **`@app/(app)/processos/page.tsx`** — remover `KpiRow`/`KpiCard`; inserir `<Tabs>` acima
   da `FilterToolbar`; atualizar `COLUMNS` para 9 colunas.
3. **`@lib/format.ts`** — extrair `shortId()` (reusar de `intimacoes/page.tsx`).
4. **`@features/processos/lib/labels.ts`** — (nada novo; já tem `lifecycleLabel`).

### Sprint 2: Coluna prazo a vencer + filtros

1. **`@features/processos/services/processos.service.ts`** — estender `ListProcessosParams`
   com `judging_body?`, `claim_value_min?`, `claim_value_max?`.
2. **`@features/processos/hooks/use-processos.ts`** — expor `filters` e `setFilters`.
3. **`@components/ui/filter-toolbar.tsx`** — injetar `filterSlot` com Selects.
4. **Mock prazo a vencer** — enquanto BE não entrega `next_deadline`, coluna mostra `—`.

### Sprint 3: Integração backend (depende de A1 e C1)

1. BE adiciona `next_deadline` ao `ProcessoView` de lista.
2. BE adiciona query params `judging_body`, `claim_value_min`, `claim_value_max`.
3. Frontend remove placeholder e habilita filtro real.

---

_Documento gerado pela triagem PM — AGENTS.md e ERD Frontend são a fonte de verdade._
