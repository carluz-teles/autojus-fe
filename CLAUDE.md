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

## Lint / Format (green gate)

`npm run build` · `npm run lint` · `npm run format:check` devem sair 0. ESLint: next core-web-vitals + TS,
`simple-import-sort` (imports/exports ordenados), `consistent-type-imports` (inline `type`), sem vars não usadas
(prefixo `_` ignora), `arrow-body-style` as-needed, `eqeqeq` smart. Prettier (defaults) + plugin tailwind por último.
