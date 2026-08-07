# Plano — Billing no Frontend

> Escopo: Dudu (Auth, Onboarding/Convites, **Billing**, Notifications — `jus-regras.md`). Feature
> candidata ao primeiro ciclo completo ERD → PO → DEV → QA → CR. Toca os dois repos: backend já
> existe (`internal/billing`); frontend é 100% a construir (`/settings/billing` hoje é
> `ComingSoon`).
>
> Fontes lidas: `docs/erd-modelo-de-dados.md`, `docs/erd-sistemas-auxiliares.md` §6,
> `internal/billing/{handler,stripe,gateway,entitlement,webhook,domain,entity,errors,validation}.go`,
> `lib/httpx/errors.go` (statusByKind), `lib/httpx/middleware/auth.go` (RequireRole).

---

## (a) Mapa dos endpoints reais (`internal/billing/handler.go`)

Todos montados em `RegisterV1` sob `/v1`, todos atrás de `RequireRole(ADMIN)` — um `MEMBER`/`LAWYER`
recebe 403. `tenant_id` sempre lido do principal (`TenantFromCtx`), nunca do body/query.

| Rota                           | Request                                                 | Response 2xx                                                                                                                                         | Erros conhecidos                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/billing/checkout`    | `{ "price_id": string }` (obrigatório, ozzo `Required`) | `200 { "checkout_url": string }`                                                                                                                     | `400` price_id vazio/malformado; `409 CONFLICT` tenant já tem assinatura ativa/trialing (`ErrAlreadySubscribed`) — o FE deve mandar pro Portal, não repetir checkout |
| `POST /v1/billing/portal`      | (sem body)                                              | `200 { "portal_url": string }`                                                                                                                       | `404 ENTITY_NOT_FOUND` tenant sem Stripe customer ainda (`ErrNoStripeCustomer`) — nunca assinou                                                                      |
| `GET /v1/billing/subscription` | —                                                       | `200 { "plan": string, "status": "trialing"\|"active"\|"past_due"\|"canceled", "current_period_end": string\|null, "active_process_limit": number }` | `404 ENTITY_NOT_FOUND` tenant nunca fez checkout (`ErrSubscriptionNotFound`) — é o estado "sem assinatura", não um erro de fato                                      |
| `GET /v1/billing/plans`        | —                                                       | `200 { "data": [{ "price_id": string, "name": string, "amount": number (centavos), "interval": string, "active_process_limit": number }] }`          | catálogo pode vir vazio (`data: []`), nunca `null`                                                                                                                   |

Mapeamento de erro (`lib/httpx/errors.go`, formato único `{kind,message,details}`):
`KindInvalid→400`, `KindUnauthorized→401`, `KindForbidden→403`, `KindNotFound→404`,
`KindConflict→409`, `KindInfra/KindUnavailable→5xx` (cause não vaza).

Webhook (`POST /webhooks/stripe`, fora de `/v1`, sem auth de usuário — assinatura Stripe própria)
não é consumido pelo FE; é o mecanismo que mantém a projeção local viva. **O FE nunca confia no
retorno do redirect de sucesso do Checkout/Portal** — ao voltar da Stripe, deve re-buscar
`GET /v1/billing/subscription` (a verdade vem do webhook, que pode ainda não ter processado).

## (b) O backend está completo para o FE consumir?

**Sim, para o escopo v0 descrito no ERD (§6.1–6.4, §13 item 4).** Os 4 endpoints cobrem o fluxo
completo: catálogo → checkout → leitura do estado → gerenciamento (portal, que cobre trocar de
plano/cancelar/atualizar cartão — responsabilidade da Stripe, não reimplementada aqui). Gating de
entitlement na borda (§6.3, item 5 do ERD) é **fatia separada**, ainda não implementada em outros
slices — fora deste plano (o FE só **exibe** `active_process_limit`, não aplica o limite).

Buracos e pontos de atenção que o FE precisa tratar, não que faltam no backend:

1. **"Sem assinatura" é modelado como 404, não como um estado com corpo.** O FE deve tratar
   `GET /v1/billing/subscription` → 404 como o estado inicial "nenhum plano ativo" (mostra o
   catálogo + botão assinar), não como erro de tela. Isso é uma decisão de UX do FE, não do BE.
2. **Sem endpoint de cancelamento direto** — cancelamento/troca de cartão/nota fiscal vivem no
   Stripe Customer Portal (`POST /billing/portal`). O FE não deve tentar construir essas telas;
   deve linkar para o portal.
3. **Sem endpoint de invoices/histórico de pagamento** no v0 — se o FE quiser mostrar histórico de
   faturas, também é o Customer Portal (Stripe já lista isso lá). Não está no ERD como algo a
   construir agora; **não planejar tela de faturas própria**.
4. **`current_period_end` pode ser `null`** (coluna nullable até o primeiro `subscription.*`
   projetar) — o FE deve tratar null explicitamente (não formatar `Invalid Date`).
5. **Race do redirect pós-Checkout**: o webhook pode demorar a chegar. O FE precisa de um estado
   de "confirmando pagamento" (poll curto ou refetch ao focar a aba) em vez de assumir sucesso
   imediato pela query string de retorno da Stripe.
6. **`amount` vem em centavos** (padrão Stripe) — o FE formata para moeda, não assume reais.

Nenhum buraco bloqueia o consumo — são decisões de tratamento de estado que cabem às fases FE
abaixo.

## (c) Plano por fases

### Fase 0 — [BACKEND] nenhuma ação necessária

O backend já está pronto (4 endpoints + webhook + eventos). Não há fase backend neste ciclo, a
menos que a decisão em aberto #1 (abaixo) mude o contrato.

### Fase 1 — [FRONTEND] camada service + hooks (sem UI ainda)

`service/billing.ts` (chamadas HTTP tipadas aos 4 endpoints, nunca manda `tenant_id`) + hooks
TanStack Query: `useSubscription()` (trata 404 como dado válido "sem assinatura", não como
`isError`), `usePlans()`, `useStartCheckout()` / `useOpenPortal()` (mutations que redirecionam
`window.location.href` para a URL retornada).

**Critérios de aceitação (testáveis):**

- `useSubscription()` retorna `{ subscription: null }` (não erro) quando a API responde 404
  `ENTITY_NOT_FOUND`; retorna os dados normalmente em 200.
- Nenhuma chamada de service envia `tenant_id` em body/query/header manualmente (o JWT/cookie de
  sessão do Clerk é o único carregador de identidade — confirmar com o client HTTP já usado no
  restante do FE, ex. interceptor que injeta `Authorization`).
- Erros 400/403/409/5xx da API chegam ao componente com `kind` e `message` do envelope
  `{kind,message,details}` intactos (o service não engole nem remapeia o formato).
- Teste unitário do parsing de `current_period_end` null → não lança, retorna `null`.

### Fase 2 — [FRONTEND] tela `/settings/billing` — estado "sem assinatura"

Substitui o `ComingSoon`. Quando `useSubscription()` resolve para `null`: mostra o catálogo
(`usePlans()`) em cards, um botão "Assinar" por plano que chama `useStartCheckout(price_id)` e
redireciona para `checkout_url`.

**Critérios de aceitação:**

- Loading: catálogo mostra skeleton, não tela em branco nem flash de conteúdo vazio.
- Erro ao carregar plano (5xx/rede): mensagem de erro com opção de retry, nunca tela quebrada nem
  stack trace exposta.
- Catálogo vazio (`data: []`): estado vazio explícito ("nenhum plano disponível no momento"), não
  uma lista sumida sem explicação.
- Botão "Assinar" desabilitado durante a mutation em voo (evita duplo-clique = duplo checkout).
- Amount formatado como moeda a partir de centavos (ex. `2990` → `R$ 29,90`), nunca cru.
- Papel `MEMBER` (não-ADMIN): a tela nem tenta chamar os endpoints — botão de assinar
  oculto/desabilitado com texto explicando que só ADMIN gerencia billing (evita depender só do 403
  da API; UX não deveria mostrar uma ação que vai falhar).

### Fase 3 — [FRONTEND] tela `/settings/billing` — estado "assinante"

Quando `useSubscription()` resolve com dado: mostra plano atual, status (badge visual por
`trialing/active/past_due/canceled`), `active_process_limit`, `current_period_end` formatado (ou
"—" quando null), e botão "Gerenciar assinatura" → `useOpenPortal()` → redireciona a `portal_url`.

**Critérios de aceitação:**

- Status `past_due` tem tratamento visual distinto (alerta, não neutro) — é o estado que precisa
  de ação do usuário (cartão falhou).
- Status `canceled` mostra call-to-action para reassinar (volta ao estado da Fase 2, reabre
  catálogo), não trava numa tela morta.
- `current_period_end: null` renderiza um placeholder textual, não erro de formatação de data.
- Botão "Gerenciar assinatura" tratando 404 `ErrNoStripeCustomer` (caso defensivo — não deveria
  ocorrer se `subscription` não é null, mas o hook trata o erro sem quebrar a tela caso a API
  retorne).

### Fase 4 — [FRONTEND] retorno do Checkout/Portal (race do webhook)

Rota de retorno (`success_url`/`return_url` configuradas no BE via env, apontando para uma rota do
FE, ex. `/settings/billing?checkout=success`) que, ao montar, **não confia na query string** —
invalida/refetch `useSubscription()` e mostra um estado transitório "confirmando pagamento…" com
poll curto (ex. refetch a cada 2s até `status` mudar ou timeout de ~15s) antes de cair no estado
final da Fase 3.

**Critérios de aceitação:**

- Sucesso simulado (mock): estado transitório aparece, depois resolve para a Fase 3 sem reload
  manual da página.
- Timeout do poll (webhook não chegou a tempo, cenário de teste): mensagem clara "ainda
  processando, isso pode levar alguns instantes" — nunca um erro genérico nem "falhou".
- Nenhuma lógica de negócio (ex. "marcar como pago") acontece no FE a partir da query string —
  apenas UI de espera; a verdade é sempre o refetch do BE.

### Fase 5 — [FRONTEND] tratamento de conflito no checkout

`useStartCheckout` ao receber `409 CONFLICT` (`ErrAlreadySubscribed`) não mostra erro genérico —
redireciona/orienta o usuário para "Gerenciar assinatura" (portal), já que ele tentou assinar de
novo estando ativo.

**Critérios de aceitação:**

- 409 no checkout → UI oferece diretamente o botão/ação de abrir o portal, não repete o erro cru
  da API.

---

## Ordem de dependência

Fase 0 (nenhuma) → Fase 1 (base) → Fase 2 e Fase 3 podem ser feitas em paralelo depois da Fase 1
(telas diferentes do mesmo componente pai, mas conflitam pouco) → Fase 4 depende de Fase 2/3
existirem (precisa da tela final para redirecionar de volta) → Fase 5 depende de Fase 2 (mesmo
fluxo de checkout).

Todas as fases são **[FRONTEND]** — não há trabalho de backend neste ciclo, a menos que a Decisão
em aberto #1 mude isso.

---

## (e) Riscos

- **Risco de UX, não de dado**: como "sem assinatura" é 404, um bug no FE que trate 404 como erro
  de rede genérico quebraria a tela para todo tenant novo (o caso mais comum!). Vale um teste
  explícito disso (já coberto na Fase 1).
- **Duplo checkout por duplo clique**: sem debounce/disable, o usuário pode abrir duas Checkout
  Sessions — não é um bug de dado (o BE não duplica assinatura, o 409 protege), mas gera sessões
  Stripe órfãs. Mitigado na Fase 2.
- **Ambiente de teste do Checkout/Portal real da Stripe**: QA/CR vão precisar de chaves de teste
  Stripe configuradas no ambiente de FE (ou mock do redirect) — combinar com Dudu antes do DEV
  começar, senão a Fase 4 não é testável ponta a ponta.
- **Nome da rota de retorno** (`success_url`/`return_url`) precisa ser combinado entre BE (env
  var) e FE (rota real) — se divergir, o redirect quebra silenciosamente. Ver decisão em aberto #2.

## Decisões em aberto (só o usuário decide)

1. **Histórico de faturas / nota fiscal**: confirmar que fica 100% delegado ao Stripe Customer
   Portal no v0 (nenhuma tela própria no FE) — este plano assume que sim, com base no ERD (§6.6
   só cita PIX/boleto como futuro, nada sobre invoice list própria).
2. **URL exata de retorno do Checkout/Portal** (`success_url`, `cancel_url`, `return_url`): qual
   rota do FE (`autojus-fe`) essas envs devem apontar — precisa existir antes do DEV configurar o
   `CheckoutConfig` no `cmd/api`. Não está nos ERDs.
3. **Comportamento do FE para role `MEMBER`**: esconder a página inteira de `/settings/billing` do
   menu, ou mostrar em modo leitura ("apenas ADMIN gerencia")? O ERD só define que a API é
   ADMIN-only; a UX de quem não é ADMIN é decisão de produto.
4. **Prioridade relativa**: este plano assume que a v0 de Billing FE é feature isolada, sem
   depender de trabalho de outros blocos (Carlos/Dahlem) — confirmar que não há dependência de
   Notifications (`payment_failed`/`subscription_activated` in-app) para este ciclo, ou se entra
   como fase adicional.

---

Próximo passo: aprovação deste plano → handoff (`/paseo-handoff`) para **`jus-fe-dev`** (Fases
1–5, todas FRONTEND). Sem fases BACKEND neste ciclo.
