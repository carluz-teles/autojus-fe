# AtJud — análise do produto e direção da landing page

Análise da revisão local `autojus-fe:f496cef` e `jus-assessoria-automatizada-be:e29df35`, em 09/09/2026. O código e os documentos de validação recentes prevalecem sobre PRDs antigos que descrevem intenção. Não houve inspeção de produção, acesso a dados de clientes ou validação de integrações reais nesta tarefa.

## O produto como um todo

O AtJud conecta acompanhamento processual, coordenação do trabalho e preparação de peças. A unidade operacional é a intimação: dela surgem providências, responsáveis, prazos e peças. O processo reúne o histórico e os documentos que dão contexto a esse trabalho.

O valor central para o escritório é reduzir a reconstrução manual de contexto entre receber uma publicação, descobrir o que fazer, distribuir a tarefa e redigir uma resposta. A IA é uma parte desse fluxo; o produto também precisa entregar visibilidade, continuidade, rastreabilidade e controle humano.

Público: advogados que executam as providências e gestores que precisam acompanhar responsabilidades e entregas. Não há dados suficientes no repositório para fixar tamanho ideal do escritório, especialidade prioritária, economia de horas, taxa de sucesso ou número de clientes.

## Capacidades, evidências e limites

| Área | O que a implementação sustenta | Evidência no repositório | Limite que afeta a comunicação |
| --- | --- | --- | --- |
| Descoberta | Captura incremental de publicações DJEN pelas OABs monitoradas, com cursor, deduplicação, retomada e histórico | BE `docs/ingestao-diaria-oab.md`, `internal/acquisition`, `cmd/scheduler` | Depende de OAB habilitada, integração ativa e configuração do agendador. Não prometer monitoramento em tempo real ou cobertura universal. |
| Enriquecimento | DataJud complementa o contexto e os movimentos processuais | BE `cmd/worker-ingestao/main.go`, conectores em `lib/`, `internal/acquisition` | DJEN e DataJud têm responsabilidades diferentes. DataJud não deve ser anunciado como fonte de publicações idêntica ao DJEN. |
| Organização | Acervo, triagem, providências, responsáveis, fila, quadro, calendário, prazos internos | FE `src/components/shell/nav-config.ts`, `src/features/action-items`, `src/features/prazos`, `src/features/triagem`; BE `internal/actionitem` | Visibilidade operacional não equivale a garantia de cumprimento. |
| Prazos | Cálculo por regime, dias úteis, recesso, feriados cadastrados e memória do cálculo; confirmação, ajuste e apuração | BE `lib/calendar/calendar.go`, `internal/deadline/{adjust,confirm,apurar,read}.go`; FE `src/features/prazos/components/intimacao-detalhe/confirmacao-prazo.tsx` | A implementação usa uma base de feriados em banco, com carga nacional. O ERD antigo fala em fornecedor licenciado: isso não descreve a composição atual. Não prometer todos os feriados municipais ou “prazo sempre certo”. |
| Avisos | Eventos de prazo próximo/vencido, caixa de notificações e preferências de entrega | BE `internal/notifications/events.go`, `internal/notifications/handler.go`; FE `src/features/notifications` | Canais e entrega dependem das preferências e serviços configurados. |
| Autos | Documentos enviados/importados, extração, indexação, recuperação de trechos, prévia PDF e referências | BE `internal/{document,extraction,indexing,court}`; FE `src/features/documentos`, `src/features/configuracoes` | Autos privados/importação em portal podem exigir autenticação ou certificado. A ausência de senha vale para as fontes públicas. |
| Construção assistida | Seleção de teses, geração contextual, perfis de peça, editor e refinamento por assistente | BE `internal/draft/generate.go`, `internal/advisory/prompt.go`, `internal/pieceprofile`; FE `src/features/pecas-v2` | A qualidade e a cobertura dependem dos documentos disponíveis, extraídos e indexados. O usuário orienta e revisa; não há garantia de correção jurídica. |
| Evidência e revisão | Sugestões estruturadas, citações com documento/página/trecho, cobertura e fundamentação a verificar nas teses | BE `internal/draft/generate.go:buildFindings`, `internal/draft/review.go`, `internal/advisory/prompt.go:composeChatGrounding`; FE referências e prévias em `src/features/pecas-v2` | Nem toda sugestão é um achado factual: clareza/estilo podem dispensar citação. `buildFindings` descarta sugestões inválidas e registra contadores; não conserva cada sugestão descartada como um item “não verificado”. A tela de teses já distingue “Referência encontrada” de “Fundamentação a verificar”. Sem lastro, a saída não deve ser tratada como certeza. A LP evita “toda resposta é verificada”. |
| Identidade e acesso | Organização por escritório, filtros de tenant, RLS e conexões autenticadas | BE `migrations/0001_init.up.sql`, `internal/identity`, `internal/certificate`; FE Clerk, onboarding e configurações | Não inferir certificações, parecer de conformidade LGPD ou ausência absoluta de risco a partir da arquitetura. |
| Assinatura comercial | Assinaturas, planos, período de avaliação, checkout e limites por processo | BE `internal/billing`; FE `src/features/billing` | O catálogo e as políticas são configuráveis. A LP não inventa preço, duração de teste ou condição sem cartão. |

## Diferenças em relação à visão apresentada

### Assinatura e protocolo

Há modelos de assinatura, protocolo, tentativas, confirmação e recibo no domínio. Isso não basta para afirmar que o fluxo definitivo está liberado. A evidência mais recente é `BE/docs/peticionamento-assincrono.md`: a integração cria, envia anexos, salva e confere um **rascunho e-SAJ/TJSP**, mas a assinatura e o envio final permanecem bloqueados. Não há recibo real nessa validação.

Na LP: “preparação de rascunhos”, “conferência” e “conforme a integração disponível”. O protocolo definitivo aparece como evolução prevista e a FAQ explica o limite.

### Verificação e transparência

A visão de manter cada achado não confirmado em uma lista explícita é mais ampla que a implementação atual. Existe sinalização de fundamentação a verificar nas teses (`teses-rail.tsx`), e a revisão guarda cobertura, mas sugestões que falham nas validações são descartadas por `buildFindings`. A LP apresenta exemplos de fonte e pendência de verificação sem prometer que todo achado descartado aparece em uma lista auditável.

### Voz do escritório

`BE/internal/advisory/prompt.go` contém o ponto de extensão `Playbook`, explicitamente vazio na versão atual. Perfis de peça estruturam a redação, mas não comprovam aprendizado automático do estilo particular de cada escritório.

Na LP: seleção de teses, orientação e refinamento pelo advogado. A voz automática aparece como evolução prevista.

### Aprendizado com o desfecho

O domínio persiste os resultados `OK`, `AMENDMENT`, `NOT_ADMITTED` e `UNTIMELY`. `UpdateObservedResult` registra o resultado; não foi encontrado um ciclo implementado que ajuste automaticamente os prompts ou o playbook do escritório a partir dele.

Na LP: aprendizado com resultados como visão de evolução, sem promessa atual de autoaperfeiçoamento.

### Providências, chat e atualização diária

- `BE/internal/actionitem/domain.go:OnIntimationAnalyzed` materializa providências da análise do teor. `BE/internal/advisory/prompt.go:composeAnalyzeIntimation` identifica atos, tipos de providência e necessidade de peça; a classificação pode ser conferida/corrigida pelo usuário.
- `BE/internal/deadline/tipo_ato.go` limita a classificação de mera ciência; `BE/internal/deadline/domain.go:OnDocketEntryObserved` reconhece movimentos de resposta e atualiza prazos. Isso não comprova automaticamente a resolução jurídica de qualquer obrigação: a LP fala em cumprimento identificado no histórico disponível.
- `BE/internal/advisory/prompt.go:toneDirective` orienta tom objetivo, enfático ou técnico. `composeChatGrounding` usa minuta, teor, teses e trechos recuperados; mudanças são propostas e precisam de aprovação. A LP não promete acesso a documentos ausentes, respostas infalíveis ou latência fixa em segundos.
- `BE/internal/acquisition/daily_oab.go` e `sync.go` sustentam a descoberta diária e atualização. A LP apresenta novos processos, publicações e movimentações chegando das fontes monitoradas, sem prometer atualização instantânea do tribunal.
- **Notificações individuais do ingest não estão ativas:** `BE/internal/notifications/listener.go:handleDocketEntryObserved` descarta a tarefa após decodificar; `docs/notificacoes-genericas.md` documenta o silêncio de processos/intimações/andamentos. Há código legado e catálogo de tipos que, isoladamente, sugerem outra capacidade. A LP descreve os avisos disponíveis (importação, prazos, atribuições) e explica no FAQ que cada evento de ingestão não gera um aviso individual.
- **Protocolo em implantação:** a seção mostra o conjunto petição + anexos + dados e a preparação atual no e-SAJ/TJSP. A evolução para envio definitivo e comprovante aparece explicitamente como em implantação. O catálogo de tribunais para leitura não comprova suporte a protocolo nesses tribunais.

## Identidade e posicionamento

O design corrente é o rebranding claro e funcional em `src/app/globals.css`, com verde/teal, papel neutro-quente e títulos Fraunces, apoiados por Geist. O handoff em `docs/design-handoff-v2/README.md` estabelece a conexão intimação → providência → prazo → peça.

A marca varia no código entre jus-assessoria, Atjus e AtJud. A LP usa **AtJud**, como solicitado, preservando as fontes e a família cromática existente. O monograma deriva do “A” já presente na interface; não altera o branding das telas existentes.

Direção: editorial contemporânea, contraste entre papel e verde profundo, destaque sálvia, tipografia expressiva, detalhes de documentos e conexões. A demonstração é feita em HTML/CSS e componentes do projeto; não depende de fotos genéricas ou capturas com dados reais.

Mensagem principal: **“A intimação chega. O próximo passo, também.”** O subtítulo conecta acervo centralizado, providências automáticas, minutas com fundamento e assistência com fontes. O posicionamento é automação do trabalho de base com critério humano.

## Estrutura implementada

1. Proposta de valor e ilustração intimação → providência → minuta.
2. Fontes separadas por função: DJEN, DataJud, eproc e e-SAJ.
3. Captura diária de novos processos, intimações e movimentações; importação de autos conforme as conexões disponíveis. Diagrama de centralização do acervo.
4. Providências automáticas com três exemplos selecionáveis: manifestação necessária, mera ciência e cumprimento identificado. Calendário e construção de peças continuam navegáveis.
5. Fluxo em quatro etapas: acompanhar, receber providências, construir, refinar e conferir.
6. Minutas com contexto, teses selecionadas, estrutura por perfil de peça e fontes verificáveis.
7. Chat com quatro exemplos: resumir documento, entender o processo, ajustar o tom e revisar a minuta. Trechos expansíveis, texto original e proposta de redação.
8. Preparação de petição, anexos e dados para o tribunal; protocolação definitiva identificada como etapa em implantação.
9. Controle operacional: memória de cálculo, continuidade e espaço do escritório.
10. Evoluções, FAQ, convite para criar conta e links para o login existente.

Os exemplos são estáticos, fictícios e identificados como demonstração. Nenhum controle chama o backend, envia mensagem, modifica processo ou protocola documento. Não foram inventados clientes, depoimentos, métricas de resultado, preços ou selos.

## Implementação e acesso

- Rota pública: `/lp`. A raiz `/` continua abrindo as notificações autenticadas.
- A página usa Server Components para o conteúdo, com interatividade limitada ao menu, à demonstração da plataforma e aos exemplos do chat.
- Os providers Clerk/React Query foram limitados aos layouts da plataforma, autenticação, convite, onboarding e desenvolvimento. A LP não precisa de chaves Clerk nem do backend para carregar.
- O proxy libera somente `/lp` e seus descendentes de metadados. As rotas da plataforma mantêm o middleware existente.
- CSS adicional limitado ao namespace `.lp`; preferência por movimento reduzido, menu acessível, abas com teclado, links semânticos e disclosures nativos.
- Os CTAs de criação de conta e entrada apontam para `/sign-up` e `/sign-in`. O funcionamento da autenticação requer a configuração Clerk habitual; a tarefa não provisiona contas ou serviços externos.

## Validação inicial — 09/09/2026

- Build de produção: passou; `/lp` é gerada estaticamente.
- Suíte completa: 32 arquivos, 232 testes aprovados, incluindo a fronteira de autenticação.
- Fronteira pública/protegida: 10 testes adicionais aprovados em `src/proxy.test.ts`.
- ESLint: sem erros; quatro avisos preexistentes em arquivos fora da LP. Arquivos novos sem avisos.
- Prettier e `git diff --check`: passaram.
- Chromium real: seleção de providências, abertura de referências, abas com setas, FAQ, menu móvel, fechamento por Escape e por navegação passaram.
- Responsividade verificada em 320, 390, 600, 768, 900, 1024, 1280, 1440 e 1920 px. Conteúdo principal também disponível sem JavaScript. Preferência de movimento reduzido respeitada.
- Axe, regras WCAG 2 A/AA e 2.1 AA: zero violações automáticas nas três abas da plataforma e nos quatro exemplos do chat, em desktop (1440 px) e celular (390 px). Isso não substitui avaliação manual completa com tecnologias assistivas.
- Rota pública confirmada com HTTP 200 em `http://localhost:3000/lp`.
- Limite do ambiente: sem chaves Clerk configuradas, `/processos` retorna erro de configuração esperado. Não houve autenticação nem validação dos fluxos reais de cadastro, login ou backend. A LP é independente dessa configuração.
- Servidor de desenvolvimento deixado ativo na porta 3000, com log em `/tmp/atjud-landing-dev.log`.

## Revalidação para entrega — 11/09/2026

- Branch atualizada sobre `origin/main:b00bdc4`, sem conflitos. Os estilos globais e componentes compartilhados recebidos da main foram preservados.
- A interface atual restringe as conexões de autos ao TJSP; a LP continua condicionando a cobertura às conexões disponíveis, sem anunciar suporte universal.
- Dependências reinstaladas com o lockfile atualizado; build de produção e formatação aprovados. ESLint sem erros, com os mesmos quatro avisos preexistentes.
- Suíte completa: 52 arquivos e 399 testes aprovados.
- Chromium: LP sem erros JavaScript, três classificações de providências, abas da plataforma, quatro exemplos do chat, referências, navegação por teclado e menu móvel funcionando. Sem overflow em 320, 390, 768, 1024 e 1440 px.
- `llms.txt`, `robots.txt` e `sitemap.xml` acessíveis sem autenticação; alias `llm.text` e `noindex` da prévia confirmados. `/processos` mantém a fronteira autenticada e apresenta o erro de configuração esperado neste ambiente sem Clerk.

Entrega na branch `feat/atjud-landing-page`. O fluxo documentado usa commits em branch própria, com integração posterior na `main`; não há exigência documentada de PR. A integração na `main` dispara o CD e permanece fora desta entrega. Backend preservado.
