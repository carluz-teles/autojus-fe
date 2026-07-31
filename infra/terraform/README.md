# infra/terraform (FE) — serviço `web` no court-legal

Split-state: este módulo gerencia **só o serviço `web`** (Next.js), dentro do projeto
**court-legal-stg** que o TF do BE cria. Deploya no environment default do stg, com domínio
auto-gerado da Railway. **State em workspace TFC próprio** (`autojus-terraform-fe`) — não o do
BE, senão os states se sobrepõem.

## O que é build-time vs runtime (crucial no Next.js)

- **`NEXT_PUBLIC_*`** = assados na IMAGEM em build-time (`--build-arg` no `docker build` do CD).
  NÃO são a fonte da verdade do cliente aqui. (O `cd.yml` passa os valores reais dos GH secrets.)
- **Runtime (server-side)**: `CLERK_SECRET_KEY` (o Clerk lê no servidor), `NODE_ENV`, `PORT`, e
  os `NEXT_PUBLIC_*` que o Clerk também lê no servidor — esses vão na variable collection do TF.

## Dependência do BE

Este módulo precisa dos outputs do TF do BE: **`project_id`** (→ var `RAILWAY_PROJECT_ID`) e
**`stg_environment_id`** (→ var `STG_ENVIRONMENT_ID`), ambos GH vars. O BE precisa ter
aplicado antes (o projeto court-legal-stg e seu environment precisam existir).

## Rodar (local)

```bash
cd infra/terraform
export RAILWAY_TOKEN=... TF_TOKEN_app_terraform_io=... TF_CLOUD_ORGANIZATION=Autojus
export STG_ENVIRONMENT_ID=<output do BE>
export CLERK_SECRET_KEY=... NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... NEXT_PUBLIC_API_URL=...
export IMAGE_TAG=$(git rev-parse HEAD)
./apply.sh          # converge-loop: cria o serviço web + vars + domínio no stg
```

## Pré-requisitos do cutover (uma vez)

1. Criar o workspace TFC **`autojus-terraform-fe`** (execution mode **Local**).
2. GH secrets/vars no repo FE: `TF_API_TOKEN`, var `TF_CLOUD_ORGANIZATION=Autojus`,
   var `RAILWAY_PROJECT_ID`, var `STG_ENVIRONMENT_ID`, secret `RAILWAY_TOKEN`,
   secret `CLERK_SECRET_KEY`, secret `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, secret `NEXT_PUBLIC_API_URL`.
3. O BE precisa ter aplicado antes (pra o env stg existir).
