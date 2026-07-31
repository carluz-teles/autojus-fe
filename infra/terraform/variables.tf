# variables.tf — tudo por env (TF_VAR_*), os mesmos secrets do GitHub Actions.
# RAILWAY_TOKEN o provider lê direto do env.

# ---- Referências ao court-legal (gerenciado pelo TF do BE; aqui só referenciamos) ----
variable "railway_project_id" {
  type        = string
  description = "ID do projeto court-legal (produção)."
  default     = "0f0790a9-235b-499d-af63-c8f83b5dba0b"
}

variable "environment_id" {
  type        = string
  description = "ID do environment production do court-legal (onde o web deploya)."
  default     = "04d181f3-b54e-48ac-8804-2719fd76f525"
}

# ---- Imagem do web ----
variable "image_registry" {
  type    = string
  default = "ghcr.io/carluz-teles"
}

variable "image_tag" {
  type        = string
  description = "Tag da imagem jus-fe-web. Em CI = github.sha (versionado)."
  default     = "latest"
}

variable "web_subdomain" {
  type        = string
  description = "Subdomínio auto-gerado da Railway pro web no stg (railway.app). Único."
  default     = "autojus-web-stg"
}

# ---- Runtime do web (server-side). NEXT_PUBLIC_* também vão baked na imagem (build-arg);
#      aqui reforçamos os que o Clerk lê no SERVIDOR + config de runtime. ----
variable "clerk_secret_key" {
  type      = string
  sensitive = true
}

variable "clerk_publishable_key" {
  type        = string
  description = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — pública; o Clerk server também lê no runtime."
}

variable "api_url" {
  type        = string
  description = "NEXT_PUBLIC_API_URL — URL pública do BE (o api do stg)."
}

variable "sign_in_url" {
  type    = string
  default = "/sign-in"
}

variable "sign_up_url" {
  type    = string
  default = "/sign-up"
}
