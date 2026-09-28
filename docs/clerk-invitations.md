# Convites de organização

O e-mail do Clerk começa em `https://clerk.atjud.com.br/v1/tickets/accept`.
Esse é o Frontend API do provedor, não uma rota Next.js. Em 25/09/2026, o
CNAME `clerk.atjud.com.br` resolvia para `frontend-api.clerk.services`, e o
endpoint público `/v1/environment` respondia com a instância de produção.
Não substituir esse host por `app.atjud.com.br`: o app não implementa o
protocolo de validação de tickets do Clerk.

## Fluxo implementado

Os convites do modal de membros e do onboarding usam a Server Action
`src/features/organization/actions/invite-member.ts`. A action verifica usuário,
papel de administrador, organização ativa e dados de entrada. O Clerk continua
responsável por enviar o e-mail e validar o ticket. O `redirectUrl` é a origem
da aplicação que executou a action, seguida de `/convite`; a origem é validada
pelo Next.js contra Host/X-Forwarded-Host antes de executar Server Actions.
Não usar `SITE_URL`, que configura a landing page pública.

Após validar o link, o Clerk retorna a `/convite`:

- `sign_up` + ticket: `/sign-up`, preservando o ticket.
- `sign_in` + ticket: `/sign-in`, preservando o ticket.
- `complete`: `/notificacoes`, cuja autenticação permanece obrigatória.
- Ticket/status ausentes ou desconhecidos: erro 400 com orientação para abrir
  o e-mail original ou solicitar novo convite.

Os componentes prebuilt concluem a autenticação. Para convites, o destino é
`/notificacoes`; o gate existente do backend continua responsável por verificar
o acesso ao escritório. Cadastro comum mantém o onboarding. Nenhuma query de
redirecionamento arbitrário é repassada pelo callback.

## Produção e convites anteriores

A consulta pública à configuração de produção em 25/09/2026 mostrou:

- `sign_in_url`: `https://accounts.atjud.com.br/sign-in`.
- `sign_up_url`: `https://accounts.atjud.com.br/sign-up`.
- `home_url`, `after_sign_in_url`, `after_sign_up_url`: `https://atjud.com.br`.

A alteração de código só afeta convites criados após o deploy. Para os links
anteriores, configurar na instância **Production** do dashboard Clerk as URLs
customizadas de entrada/cadastro para `https://app.atjud.com.br/sign-in` e
`https://app.atjud.com.br/sign-up`, e o retorno à aplicação para
`https://app.atjud.com.br/notificacoes`. Alternativamente, revogar e emitir um
novo convite pelo app após o deploy. Não reenviar/revogar automaticamente os
convites existentes durante a implantação.

As credenciais locais disponíveis são de desenvolvimento (`sk_test_`); a
configuração da instância de produção não foi alterada neste trabalho. Os
registros DNS existentes do Clerk não precisam ser trocados por registros do app.

Validar após o deploy com destinatários de teste: conta nova, conta existente,
sessão já autenticada, convite expirado/revogado e tentativa por não administrador.
Não consumir convites reais de usuários durante os testes.

Referências:

- https://clerk.com/docs/guides/organizations/add-members/invitations
- https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations
