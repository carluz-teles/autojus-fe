#!/usr/bin/env bash
# infra/terraform/_env.sh (FE) — mapeia env do projeto -> TF_VAR_* (DRY). Sourced pelo apply.sh.
# RAILWAY_TOKEN o provider lê direto do env. Secrets = os mesmos do GitHub Actions.
: "${RAILWAY_TOKEN:?RAILWAY_TOKEN obrigatório}"
: "${CLERK_SECRET_KEY:?}"
: "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:?}"
: "${NEXT_PUBLIC_API_URL:?}"

# Backend de state (Terraform Cloud) — workspace PRÓPRIO do FE (não o do BE).
: "${TF_CLOUD_ORGANIZATION:?TF_CLOUD_ORGANIZATION obrigatório (= Autojus)}"
export TF_CLOUD_ORGANIZATION
export TF_WORKSPACE="${TF_WORKSPACE:-autojus-terraform-fe}"

# court-legal de PRODUÇÃO (ids estáveis; override por env se precisar).
export TF_VAR_railway_project_id="${RAILWAY_PROJECT_ID:-0f0790a9-235b-499d-af63-c8f83b5dba0b}"
export TF_VAR_environment_id="${ENVIRONMENT_ID:-04d181f3-b54e-48ac-8804-2719fd76f525}"
export TF_VAR_image_registry="${IMAGE_REGISTRY:-ghcr.io/carluz-teles}"
export TF_VAR_image_tag="${IMAGE_TAG:-latest}"
export TF_VAR_web_subdomain="${WEB_SUBDOMAIN:-autojus-web}"
export TF_VAR_clerk_secret_key="$CLERK_SECRET_KEY"
export TF_VAR_clerk_publishable_key="$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
export TF_VAR_api_url="$NEXT_PUBLIC_API_URL"
export TF_VAR_sign_in_url="${NEXT_PUBLIC_CLERK_SIGN_IN_URL:-/sign-in}"
export TF_VAR_sign_up_url="${NEXT_PUBLIC_CLERK_SIGN_UP_URL:-/sign-up}"
