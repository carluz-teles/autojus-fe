# versions.tf — FE (serviço web) na Railway via Terraform. STATE SEPARADO do BE.
#
# Split-state: este módulo gerencia SÓ o serviço `web`, dentro do projeto court-legal que
# JÁ EXISTE (criado pelo TF do BE / provision.sh). NÃO cria o projeto nem os serviços do BE
# — referencia o projeto e o environment stg por ID. Workspace TFC próprio (não o do BE,
# senão os states se sobrepõem).
terraform {
  required_version = ">= 1.15.0"

  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.6"
    }
  }

  # State remoto no Terraform Cloud. Org e workspace por env (TF_CLOUD_ORGANIZATION,
  # TF_WORKSPACE=autojus-terraform-fe). Auth via TF_TOKEN_app_terraform_io.
  cloud {}
}

provider "railway" {}
