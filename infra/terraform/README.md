# infra/terraform (FE) — serviço `web` no court-legal (produção)

Split-state: este módulo gerencia **só o serviço `web`** (Next.js), dentro do projeto
**court-legal** (produção, `0f0790a9-…`, env production `04d181f3-…`). O `web` ainda NÃO existe
→ é **criado do zero** (sem import). O TF do BE é dono do projeto/serviços do BE; este só do
`web`. **State em workspace TFC próprio** (`autojus-terraform-fe`) — não o do BE.

## Build-time vs runtime (Next.js)

- **`NEXT_PUBLIC_*`** = assados na IMAGEM em build-time (`--build-arg` no `docker build` do CD).
- **Runtime (server)**: `CLERK_SECRET_KEY`, `NODE_ENV`, `PORT`, e os `NEXT_PUBLIC_*` que o Clerk
  também lê no servidor — na variable collection do TF.

## Rodar (local)

```bash
cd infra/terraform
export RAILWAY_TOKEN=... TF_TOKEN_app_terraform_io=... TF_CLOUD_ORGANIZATION=Autojus
export CLERK_SECRET_KEY=... NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... NEXT_PUBLIC_API_URL=...
export IMAGE_TAG=$(git rev-parse HEAD)
./apply.sh          # cria o web + vars + domínio no court-legal (env production)
```
(project_id e environment_id têm default de produção no `_env.sh`; override por env se preciso.)

## Pré-requisitos do cutover (uma vez)

1. Criar o workspace TFC **`autojus-terraform-fe`** (execution mode **Local**).
2. GH secrets/vars: `TF_API_TOKEN`, var `TF_CLOUD_ORGANIZATION=Autojus`, secret `RAILWAY_TOKEN`,
   secret `CLERK_SECRET_KEY`, secret `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, secret `NEXT_PUBLIC_API_URL`.
