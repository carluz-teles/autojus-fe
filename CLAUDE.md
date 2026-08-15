@AGENTS.md

# jus-assessoria — Frontend (Next.js · App Router)

Frontend da plataforma de assessoria jurídica automatizada. Consome o **backend Go** (`/v1`, formato de
erro `{kind,message,details}`, paginação por cursor, upload por presigned URL). Fonte de verdade do design:
ERD Frontend (Notion). Onde este arquivo e o ERD divergirem, o ERD vence.

**Next.js 16** — Middleware virou **Proxy** (`src/proxy.ts`), não `middleware.ts`. Antes de codar qualquer
API do Next, leia `node_modules/next/dist/docs/` (a versão instalada tem breaking changes). Bibliotecas: use
**context7** para a doc da versão instalada antes de escrever (Clerk, TanStack Query, RHF, Zod, shadcn).

## Stack (versões instaladas — conferir via context7)

Next 16 (App Router, `src/`, alias `@/*`) · React 19 · TypeScript · **TanStack Query v5** (server state) ·
**React Hook Form + Zod** (`@hookform/resolvers`) · **Tailwind v4 + shadcn/ui** (`components/ui`, util `cn`) ·
**Clerk** (`@clerk/nextjs`) · OTEL web.

## Arquitetura — service → hook → component (estrito)

```
src/app/          rotas + shell (Server Components); compõe features
src/features/<f>/ services/ (fetch tipado)  ·  hooks/ (React Query + estado)  ·  components/ (UI)
src/lib/          infra compartilhada: api/ (apiFetch + ApiError), utils (cn), auth
src/components/ui shadcn primitives
src/proxy.ts      clerkMiddleware (Next 16)
```

Regras (inegociáveis):

- **Componente não declara função** de lógica inline (handlers/cálculos vivem em hook/service). Componente = JSX + binding.
- **Hook público compõe sub-hooks `_private`** (um por responsabilidade). O componente chama só o hook público.
- **Server state = TanStack Query, nunca `useState`.** `useState` só para UI local efêmera (aberto/fechado, input não submetido).
- **Todo I/O passa por `src/lib/api/client.ts` (`apiFetch`)** — interceptor único: monta URL, anexa JWT do Clerk, converte falha em `ApiError`. Ninguém faz `fetch` cru nem inspeciona `Response`.
- **`ApiError` tem um só parser** (`src/lib/api/errors.ts`), espelhando `{kind,message,details}` do BE.
- **Polling que se auto-desliga** ao atingir estado terminal do saga (ex.: `refetchInterval` retorna `false` quando `saga_state` é final).
- **Upload = 3 passos presigned** (pede URL ao BE → PUT no storage → confirma no BE).
- **Features = Client Components; shell/layout = Server Components.**
- **Auth (Clerk): Org = tenant.** Manda só o JWT; o BE resolve `org_id→tenant_id`. **Nunca** envie `tenant_id`/`org_id` no body ou query.
- **Forms**: React Hook Form + Zod resolver; o schema Zod é a fonte da validação client-side.

## Fluxo de git e tags (obrigatório — vários devs em repos separados, front e back)
Nunca commitar direto na `main` (é prod). Sempre: `git checkout main && git pull` → branch nova a partir dela →
commits na branch → merge de volta na `main`, resolvendo conflito quando aparecer.

Tags SemVer (`vMAJOR.MINOR.PATCH`) criadas **após** o merge na `main`, nunca antes:
- Primeiro merge do v0 em produção → `v1.0.0`.
- Feature nova (tela, fluxo) → bump de MINOR (`v1.1.0`, `v1.2.0`, ...).
- Bugfix/hotfix → bump de PATCH (`v1.0.1`, `v1.0.2`, ...).
- Breaking change (contrato com o backend, rota) → bump de MAJOR.

Mesma convenção do repo backend (`jus-assessoria-automatizada-be`), pra manter os dois lados sincronizáveis por tag.

## Lint / Format (green gate)

`npm run build` · `npm run lint` · `npm run format:check` devem sair 0. ESLint: next core-web-vitals + TS,
`simple-import-sort` (imports/exports ordenados), `consistent-type-imports` (inline `type`), sem vars não usadas
(prefixo `_` ignora), `arrow-body-style` as-needed, `eqeqeq` smart. Prettier (defaults) + plugin tailwind por último.
