# Padrão editorial do app

Referência: bancada de construção de peça aprovada. O objetivo é aplicar a
mesma identidade ao produto, sem mudar suas regras jurídicas ou de acesso.

## Diretrizes

- Manter o header compartilhado compacto (44px no desktop); permitir quebra
  de ações no celular. Título de página semântico, mesmo quando editável.
- Fraunces nos títulos de conteúdo, Geist nos controles e textos de interface.
  Manter o verde semântico existente; não criar paletas particulares por tela.
- Usar `Card` ou `surface-panel` para superfícies principais e `surface-inset`
  para conteúdo de apoio. Bordas finas, sombras discretas e espaçamento consistente.
- Usar `IconAction` em ações secundárias evidentes: nome acessível, tooltip,
  carregamento e desabilitação. Ações jurídicas importantes mantêm rótulo e
  confirmação; nunca esconder consequências atrás de um ícone ambíguo.
- Usar `RowActions` para menus de linha: portal fora da área de rolagem,
  navegação por teclado, Escape e retorno de foco. Não recriar menus absolutos.
- Preferir `Sheet` em fluxos laterais e `Popover` para controles contextuais
  compactos, como versões. Não substituir automaticamente um pelo outro.
- Superfícies devem ter `min-w-0`; grades empilham em telas estreitas. Rolagem
  horizontal contextual de tabelas/filtros é permitida, nunca da página inteira.
- Preservar foco visível, labels, estados vazios/erro/carregamento e preferência
  por movimento reduzido. Controles compartilhados têm alvo de toque de 44px.
- Não alterar serviços, permissões, aceite, protocolo ou transições de estado
  como parte de uma mudança visual.

Referência navegável: `/dev/ds`, com dados de demonstração sem mutações.

## Cobertura implementada

| Área | Aplicação |
| --- | --- |
| Shell | Sidebar recolhível, navegação móvel, conta/organização, skip link, header e conteúdo |
| Componentes | Cards, botões, tabelas, menus, filtros, paginação, tabs, tooltips, popovers, sheets, KPIs, vazios e erro |
| Operação | Processos e detalhe, intimações e detalhe, triagem, fila, meus prazos, providências e detalhe |
| Contexto jurídico | Confirmação de prazo, análise, formulários de providência, autos/PDF; bancada preservada |
| Calendário | Cabeçalho responsivo, navegação compacta, visões dia/semana e alternância acessível |
| Administração | Perfil, organização, equipe, fontes, certificados, convites, MFA e preferências |
| Entrada | Onboarding, primeira importação, widget, avisos de convite e trial |

Autenticação/convite continuam usando os fluxos existentes e herdam as primitivas
compartilhadas; não houve substituição da interface gerenciada pelo Clerk.
Protótipos antigos e componentes legados não usados pelas rotas ativas não foram
reescritos. A bancada aprovada mantém layout, assistente, streaming e ações.

## Validação local

- Build de produção e TypeScript sem erros.
- Suíte Vitest: 231 testes, incluindo seis novos testes de primitivas compartilhadas.
- ESLint: zero erros; quatro avisos existentes de `set-state-in-effect` em PDF,
  widget de onboarding, fluxo de onboarding e formulário de perfil.
- Browser headful local: larguras CSS de 391px, 768px e aproximadamente 1440px.
  Rotas principais e amostras de detalhes verificadas sem erro de página ou
  transbordamento horizontal do documento.
- Menu móvel e menu de conta: empilhamento e fechamento ao navegar; Escape
  restaura foco. Menus de linha: abertura por teclado, itens desabilitados,
  fechamento por Escape e retorno ao gatilho. Versões permanece um popover.
- Não foram executados aceite de intimação, protocolo, alterações de credenciais
  ou novas importações. Não é uma certificação de todos os fluxos E2E ou leitores
  de tela; esses fluxos continuam exigindo testes próprios de domínio.

Mudanças locais: sem commit, push ou deploy nesta etapa.
