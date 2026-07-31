#!/usr/bin/env bash
# infra/terraform/apply.sh (FE) — apply CONVERGENTE e serial do serviço web.
# Mesmo modelo do BE: o backend da Railway é assíncrono/lossy, então re-aplica até `plan`
# limpar (MAX_ATTEMPTS). SEM destroy-on-failure. THROTTLE: -parallelism=1.
set -euo pipefail
cd "$(dirname "$0")"

MAX_ATTEMPTS="${MAX_ATTEMPTS:-4}"
# shellcheck source=_env.sh
source ./_env.sh

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }

log "terraform init…"
terraform init -input=false -no-color

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  log "apply (tentativa $attempt/$MAX_ATTEMPTS, parallelism=1)…"
  if ! terraform apply -input=false -no-color -auto-approve -parallelism=1; then
    log "ERRO no apply (tentativa $attempt). Saindo != 0 (nada destruído)."
    exit 1
  fi
  set +e
  terraform plan -input=false -no-color -detailed-exitcode -parallelism=1 >/dev/null
  rc=$?
  set -e
  case "$rc" in
    0) log "CONVERGIU na tentativa $attempt."; terraform output -no-color || true; exit 0 ;;
    2) log "Ainda há drift — re-aplicando…" ;;
    *) log "ERRO no plan de verificação (exit=$rc)."; exit 1 ;;
  esac
done
log "NÃO CONVERGIU após $MAX_ATTEMPTS tentativas. Nada destruído."
exit 1
