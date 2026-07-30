#!/usr/bin/env bash
# infra/railway/provision.sh — provisiona o serviço FE no MESMO projeto Railway do
# BE (court-legal), via GraphQL API. Espelha o script do backend
# (jus-assessoria-automatizad/infra/railway/provision.sh); aqui só existe UM
# serviço ("web"), sem Postgres/Redis/volume — o FE não tem estado próprio.
#
# NEXT_PUBLIC_* são embutidas no bundle do CLIENTE em tempo de BUILD (não runtime) —
# o CI já as passa como --build-arg pro Dockerfile. Aqui só setamos as vars de
# RUNTIME de verdade (CLERK_SECRET_KEY) + as NEXT_PUBLIC_* de novo, por
# consistência/depuração (documentam o que a imagem já tem embutido).
#
# Uso local:  set -a; source .env.railway; set +a; ./infra/railway/provision.sh
# No CI: um job injeta os secrets como env e roda este script.
set -euo pipefail

# ===== 1) Config e segredos (env vars) =====
: "${RAILWAY_TOKEN:?RAILWAY_TOKEN obrigatório (Account/Team token)}"
: "${RAILWAY_WORKSPACE_ID:?RAILWAY_WORKSPACE_ID obrigatório}"
: "${CLERK_SECRET_KEY:?}"
: "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:?}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL obrigatório — URL pública do serviço api}"
export NEXT_PUBLIC_CLERK_SIGN_IN_URL="${NEXT_PUBLIC_CLERK_SIGN_IN_URL:-/sign-in}"
export NEXT_PUBLIC_CLERK_SIGN_UP_URL="${NEXT_PUBLIC_CLERK_SIGN_UP_URL:-/sign-up}"

# Config não-secreta — MESMO projeto do BE.
export PROJECT_NAME="${PROJECT_NAME:-court-legal}"
export IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/carluz-teles}"
export IMAGE_TAG="${IMAGE_TAG:-latest}"
export SERVICE_NAME="${SERVICE_NAME:-web}"

export API="https://backboard.railway.app/graphql/v2"

# ===== 2) Helper GraphQL (idêntico ao do BE) =====
gql() {
  local __vars="${2:-}"; [ -n "$__vars" ] || __vars='{}'
  RAILWAY_QUERY="$1" RAILWAY_VARS="$__vars" python3 - <<'PY'
import os, json, urllib.request, urllib.error, sys
body = json.dumps({"query": os.environ["RAILWAY_QUERY"],
                   "variables": json.loads(os.environ["RAILWAY_VARS"])}).encode()
req = urllib.request.Request(os.environ["API"], data=body, headers={
    "Authorization": "Bearer " + os.environ["RAILWAY_TOKEN"],
    "Content-Type": "application/json",
    # Railway fica atrás do Cloudflare, que bloqueia o UA padrão do urllib (erro 1010).
    "User-Agent": "curl/8.5.0"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=45))
except urllib.error.HTTPError as e:
    sys.stderr.write("HTTP %s: %s\n" % (e.code, e.read().decode()[:500])); sys.exit(1)
if r.get("errors"):
    sys.stderr.write("GQL ERROR: " + json.dumps(r["errors"])[:500] + "\n"); sys.exit(1)
print(json.dumps(r["data"]))
PY
}
jpath() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }

# ===== 3) Projeto/ambiente/serviços existentes (o BE já criou o projeto) =====
log "Procurando projeto '$PROJECT_NAME' no workspace…"
PROJECT_ID="$(gql '{ me { workspaces { id projects { edges { node { id name } } } } } }' \
  | python3 -c "import sys,json,os
d=json.load(sys.stdin); wid=os.environ['RAILWAY_WORKSPACE_ID']; name=os.environ['PROJECT_NAME']
pid=''
for w in d['me']['workspaces']:
  if w['id']==wid:
    for e in w['projects']['edges']:
      if e['node']['name']==name: pid=e['node']['id']
print(pid)")"
if [ -z "$PROJECT_ID" ]; then
  echo "ERRO: projeto '$PROJECT_NAME' não existe — rode o provision.sh do backend primeiro." >&2
  exit 1
fi
export PROJECT_ID
log "PROJECT_ID=$PROJECT_ID"

read -r ENV_ID SERVICES_JSON < <(gql 'query($id: String!){ project(id:$id){ environments{ edges{ node{ id name } } } services{ edges{ node{ id name } } } } }' \
  "$(python3 -c "import os,json;print(json.dumps({'id':os.environ['PROJECT_ID']}))")" \
  | python3 -c "import sys,json
d=json.load(sys.stdin)['project']
env=''
for e in d['environments']['edges']:
  if e['node']['name']=='production': env=e['node']['id']
svc={e['node']['name']:e['node']['id'] for e in d['services']['edges']}
print(env, json.dumps(svc))")
export ENV_ID
log "ENV_ID(production)=$ENV_ID"
svc_id() { printf '%s' "$SERVICES_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get(sys.argv[1],''))" "$1"; }

# ===== 4) find-or-create do serviço web =====
WEB_ID="$(svc_id "$SERVICE_NAME")"
if [ -z "$WEB_ID" ]; then
  log "Criando serviço '$SERVICE_NAME'…"
  WEB_ID="$(gql 'mutation($i: ServiceCreateInput!){ serviceCreate(input:$i){ id } }' \
    "$(python3 -c "import os,json;print(json.dumps({'i':{'projectId':os.environ['PROJECT_ID'],'environmentId':os.environ['ENV_ID'],'name':os.environ['SERVICE_NAME'],'source':{'image':f\"{os.environ['IMAGE_REGISTRY']}/jus-fe-{os.environ['SERVICE_NAME']}:{os.environ['IMAGE_TAG']}\"}}}))")" \
    | jpath "['serviceCreate']['id']")"
else
  log "Serviço '$SERVICE_NAME' já existe ($WEB_ID)."
fi
export WEB_ID

# ===== 5) Variáveis de runtime (skipDeploys — o deploy roda uma vez no fim) =====
log "Setando variáveis…"
VARS_JSON="$(python3 -c "import os,json;print(json.dumps({
  'CLERK_SECRET_KEY': os.environ['CLERK_SECRET_KEY'],
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': os.environ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'],
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL': os.environ['NEXT_PUBLIC_CLERK_SIGN_IN_URL'],
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL': os.environ['NEXT_PUBLIC_CLERK_SIGN_UP_URL'],
  'NEXT_PUBLIC_API_URL': os.environ['NEXT_PUBLIC_API_URL'],
  'NODE_ENV': 'production',
  'PORT': '3000',
}))")"
gql 'mutation($i: VariableCollectionUpsertInput!){ variableCollectionUpsert(input:$i) }' \
  "$(VARS="$VARS_JSON" python3 -c "import os,json;print(json.dumps({'i':{'projectId':os.environ['PROJECT_ID'],'environmentId':os.environ['ENV_ID'],'serviceId':os.environ['WEB_ID'],'variables':json.loads(os.environ['VARS']),'replace':True,'skipDeploys':True}}))")" \
  >/dev/null

# ===== 6) Domínio público (idempotente e NÃO-fatal — se já existir, Railway pode
# recusar; nesse caso seguimos e o operador confere no dashboard). =====
ensure_domain() {
  local sid="$1" label="$2" out domain
  out="$(gql 'mutation($i: ServiceDomainCreateInput!){ serviceDomainCreate(input:$i){ domain } }' \
    "$(SID="$sid" python3 -c "import os,json;print(json.dumps({'i':{'environmentId':os.environ['ENV_ID'],'serviceId':os.environ['SID']}}))")" 2>/dev/null)" || {
    echo "  (domínio de $label pode já existir — confira no dashboard Railway)" >&2
    return 0
  }
  domain="$(printf '%s' "$out" | jpath "['serviceDomainCreate']['domain']" 2>/dev/null || true)"
  [ -n "$domain" ] && echo "  + domínio de $label: https://$domain"
}
log "Garantindo domínio público do serviço web…"
ensure_domain "$WEB_ID" "$SERVICE_NAME"

# Se o serviço api do BE ainda não tiver domínio público, o FE (browser) não
# consegue chamá-lo — garantimos aqui também (idempotente/não-fatal).
API_ID="$(svc_id api)"
if [ -n "$API_ID" ]; then
  log "Garantindo domínio público do serviço api (BE)…"
  ensure_domain "$API_ID" "api"
fi

# ===== 7) Deploy =====
log "Disparando deploy de '$SERVICE_NAME'…"
gql 'mutation($e: String!, $s: String!){ serviceInstanceRedeploy(environmentId:$e, serviceId:$s) }' \
  "$(python3 -c "import os,json;print(json.dumps({'e':os.environ['ENV_ID'],'s':os.environ['WEB_ID']}))")" >/dev/null
echo "  ↻ $SERVICE_NAME"

log "Pronto. Serviço '$SERVICE_NAME' provisionado no projeto '$PROJECT_NAME'."
