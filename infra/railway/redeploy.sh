#!/usr/bin/env bash
# infra/railway/redeploy.sh — dispara redeploy do serviço "web" no Railway.
#
# O Railway NÃO faz pull automático quando uma tag do registry muda, então depois
# que o CI empurra a imagem (:latest + :sha) é preciso pedir o redeploy. Mesmo
# padrão do redeploy.sh do backend, só que para um único serviço.
#
# Env: RAILWAY_TOKEN (obrigatório), PROJECT_NAME (default court-legal),
# SERVICE_NAME (default web).
set -euo pipefail

: "${RAILWAY_TOKEN:?RAILWAY_TOKEN obrigatório}"
export PROJECT_NAME="${PROJECT_NAME:-court-legal}"
export SERVICE_NAME="${SERVICE_NAME:-web}"
export API="https://backboard.railway.app/graphql/v2"

gql() {
  local __vars="${2:-}"; [ -n "$__vars" ] || __vars='{}'
  RAILWAY_QUERY="$1" RAILWAY_VARS="$__vars" python3 - <<'PY'
import os, json, urllib.request, urllib.error, sys
body = json.dumps({"query": os.environ["RAILWAY_QUERY"],
                   "variables": json.loads(os.environ["RAILWAY_VARS"])}).encode()
req = urllib.request.Request(os.environ["API"], data=body, headers={
    "Authorization": "Bearer " + os.environ["RAILWAY_TOKEN"],
    "Content-Type": "application/json",
    "User-Agent": "curl/8.5.0"})  # Cloudflare bloqueia o UA padrão do urllib (erro 1010)
try:
    r = json.load(urllib.request.urlopen(req, timeout=45))
except urllib.error.HTTPError as e:
    sys.stderr.write("HTTP %s: %s\n" % (e.code, e.read().decode()[:400])); sys.exit(1)
if r.get("errors"):
    sys.stderr.write("GQL ERROR: " + json.dumps(r["errors"])[:400] + "\n"); sys.exit(1)
print(json.dumps(r["data"]))
PY
}

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }

log "Procurando projeto '$PROJECT_NAME'…"
read -r PROJECT_ID ENV_ID < <(gql '{ me { workspaces { projects { edges { node { id name environments { edges { node { id name } } } } } } } } }' \
  | python3 -c "import sys,json,os
d=json.load(sys.stdin); name=os.environ['PROJECT_NAME']; pid=env=''
for w in d['me']['workspaces']:
  for e in w['projects']['edges']:
    n=e['node']
    if n['name']==name:
      pid=n['id']
      for ee in n['environments']['edges']:
        if ee['node']['name']=='production': env=ee['node']['id']
print(pid, env)")

if [ -z "$PROJECT_ID" ] || [ -z "$ENV_ID" ]; then
  echo "ERRO: projeto '$PROJECT_NAME' ou environment production não encontrado" >&2
  exit 1
fi
export PROJECT_ID ENV_ID
log "PROJECT_ID=$PROJECT_ID ENV_ID(production)=$ENV_ID"

SID="$(gql 'query($id: String!){ project(id:$id){ services{ edges{ node{ id name } } } } }' \
  "$(python3 -c "import os,json;print(json.dumps({'id':os.environ['PROJECT_ID']}))")" \
  | python3 -c "import sys,json,os;d=json.load(sys.stdin)['project']['services']['edges'];print(next((e['node']['id'] for e in d if e['node']['name']==os.environ['SERVICE_NAME']),''))")"

if [ -z "$SID" ]; then
  echo "ERRO: serviço '$SERVICE_NAME' não encontrado no projeto '$PROJECT_NAME' — rode o provision.sh primeiro." >&2
  exit 1
fi

log "Redeployando '$SERVICE_NAME'…"
gql 'mutation($e: String!, $s: String!){ serviceInstanceRedeploy(environmentId:$e, serviceId:$s) }' \
  "$(SID="$SID" python3 -c "import os,json;print(json.dumps({'e':os.environ['ENV_ID'],'s':os.environ['SID']}))")" >/dev/null
echo "  ↻ $SERVICE_NAME"
