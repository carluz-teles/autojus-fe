# main.tf — o serviço `web` (Next.js) no projeto court-legal, environment stg.
#
# Split-state: NÃO declaramos o projeto nem os serviços do BE — só o `web`, referenciando o
# projeto court-legal-stg (var.railway_project_id) e seu environment (var.stg_environment_id)
# por ID. O TF do BE cria e é dono do projeto/serviços do BE; este é dono só do `web`.
#
# NEXT_PUBLIC_* NÃO entram aqui como fonte da verdade do CLIENTE: eles são assados na IMAGEM
# em build-time (--build-arg no docker build do CD). As variable collections abaixo carregam
# o runtime SERVER-side (CLERK_SECRET_KEY) + os NEXT_PUBLIC_* que o Clerk lê no SERVIDOR
# (mesmos valores da imagem) + NODE_ENV/PORT.

locals {
  web_vars = {
    CLERK_SECRET_KEY                  = var.clerk_secret_key
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
    NEXT_PUBLIC_API_URL               = var.api_url
    NEXT_PUBLIC_CLERK_SIGN_IN_URL     = var.sign_in_url
    NEXT_PUBLIC_CLERK_SIGN_UP_URL     = var.sign_up_url
    NODE_ENV                          = "production"
    PORT                              = "3000"
  }
}

# ===== Serviço web (novo — não existe ainda no court-legal) =====
resource "railway_service" "web" {
  name         = "web"
  project_id   = var.railway_project_id
  source_image = "${var.image_registry}/jus-fe-web:${var.image_tag}"
}

# ===== Variáveis do web no environment stg =====
resource "railway_variable_collection" "web" {
  environment_id = var.stg_environment_id
  service_id     = railway_service.web.id

  variables = [for k, v in local.web_vars : { name = k, value = v }]
}

# ===== Domínio auto-gerado da Railway pro web no stg =====
resource "railway_service_domain" "web" {
  subdomain      = var.web_subdomain
  environment_id = var.stg_environment_id
  service_id     = railway_service.web.id
}
