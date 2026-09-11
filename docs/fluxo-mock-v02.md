# Fluxo mockado dentro da estrutura do app — V02

Entrada: `/dev/fluxo/triagem`. Mesmos componentes de sidebar e cabeçalho do app, sem os hooks de contadores, organização, onboarding ou notificações de negócio. Identidade e registros demonstrativos. A autenticação global do Clerk permanece; não é uma tela pública. Todas as rotas desta simulação retornam 404 em produção.

## Encaixe proposto

| Área existente | Papel no mock |
| --- | --- |
| Triagem | Decidir o trabalho e tornar explícito seu destino após a análise. |
| Providências | Quadro de execução: a fazer, em andamento e concluídas; estado da peça dentro de cada item. |
| Fila | Os mesmos itens em lista, sem novas tarefas. |
| Meus Prazos | Recorte das providências abertas atribuídas a Luan Gomes, com prazo vinculado. Não representa a cobertura completa da tela real. |
| Intimações | Acervo da publicação, vínculos com todas as providências e atalhos para as peças. |
| Detalhe da providência | Execução, responsável atual, etapas, pendências, peça e histórico. |
| Peça | Documento com contexto persistente e retorno para a providência; sem novo destino na sidebar. |
| Protocolo | Registro contextual de preparação/tentativa/comprovante, distinto da existência de uma peça. |
| Processos | Lista demonstrativa com acesso à intimação vinculada. |

Notificações, Calendário e Configurações continuam visíveis para comparar a organização do menu, mas mostram estado explícito de área não mockada. Não carregam dados reais.

## Teste da saída da triagem

A triagem representa 240 pendências fictícias na listagem original do app: tipografia editorial, três grupos (intimação/processo, vencimento e responsável/situação), ListToolbar e identidade Responsavel reutilizados. Há busca por processo, partes e assunto, filtros de responsável e prazo a confirmar e paginação de 10/25/50 itens. A seleção é restrita à página atual e é limpa ao mudar página ou filtros, evitando ações sobre itens ocultos.

“Revisar seleção” abre o conteúdo e destino de cada publicação em painel lateral. “Encaminhar · simular” altera apenas um contexto React em memória. A publicação não é removida. Uma providência vinculada é criada uma única vez por item; quadro, lista, acervo e contador da sidebar refletem esse mesmo estado. Responsável e prazo são preservados, inclusive quando a confirmar. A operação não gera peça, não confirma prazo, não dá ciência e não acessa o backend.

Navegação client-side entre mocks preserva o estado. Recarregar ou sair da simulação reinicia os dados. URLs de intimação, providência e peça permitem abrir diretamente os exemplos existentes. O item criado em memória não existe após um reload, e mostra estado de exemplo não encontrado.

## Redundâncias para discutir

- **Fila / Providências:** candidato mais forte à unificação como visualizações Lista / Quadro. Mantidos os dois destinos para avaliar antes de alterar a navegação real.
- **Intimação / Providência:** não repetir a mesma tela. A primeira reúne origem e vínculos; a segunda detalha a execução. Atalhos diretos para a peça evitam uma parada obrigatória adicional.
- **Meus Prazos / Fila:** há sobreposição neste recorte, mas não concluir que a tela real pode ser removida sem avaliar revisão de prazos, urgência e itens sem providência.
- **Peças:** não foi criado novo item global. Testar primeiro o acesso contextual; um acervo de peças só se justifica por uma necessidade de busca transversal.

Nenhum contrato de API, estado de domínio, permissão ou regra operacional foi portado. A transição de triagem é uma hipótese de UX, não uma substituição dos gates atuais.

## Validação inicial (antes da expansão da triagem)

- 274 testes passando; build e TypeScript aprovados.
- Após simular a análise: Triagem 1 → 0; 7 providências no quadro e 7 na lista, uma única ocorrência da nova providência; 6 intimações preservadas.
- Sidebar e links de negócio da simulação permanecem sob `/dev/fluxo`.

## Expansão da triagem para volume

- 12 testes do protótipo: volume, busca combinada, transição em lote, idempotência e preservação de vínculo, responsável e prazo.
- Teste no browser: encaminhar 2 publicações reduz Triagem 240 → 238, com retorno para Providências.
- Uma única identificação da página no header. No mobile, as colunas se reorganizam em blocos dentro da mesma linha, como na triagem real, sem rolagem horizontal.
