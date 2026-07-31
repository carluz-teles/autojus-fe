output "web_service_id" {
  value       = railway_service.web.id
  description = "ID do serviço web."
}

output "web_url" {
  value       = "https://${railway_service_domain.web.domain}"
  description = "URL auto-gerada da Railway pro web no stg."
}
