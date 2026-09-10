# Jornada contínua — protótipo V01

Rota local: `/dev/jornada`. Retorna 404 em produção. Nenhuma chamada à API de negócio, IA, tribunal ou armazenamento. Todos os casos e eventos são fictícios. Não modifica a navegação real do app.

## Hipótese de experiência

A intimação não desaparece quando sai da triagem: muda o trabalho que precisa ser feito. O advogado deve enxergar o destino, o responsável pelo próximo passo, as pendências e os documentos produzidos sem reconstruir o contexto entre telas.

Três superfícies conectadas:

- **Acompanhamento:** lista de intimações com situação, responsável atual, providências abertas, peça/versão/autoria/última edição e prazo.
- **Jornada da intimação:** origem, providências paralelas, percurso da providência selecionada, próximo passo e histórico com autores e horários.
- **Bancada conectada:** prévia de contexto persistente ao abrir a peça. A bancada real não foi substituída. Retorno preserva a intimação e a providência selecionada.

A preparação/tentativa/comprovante têm uma prévia de leitura própria. Não há botão operacional de envio.

## Cenários para avaliar

1. Helena: peça v3 aguardando revisão de Luan, elaborada por Marina; documento pendente em outra providência. Abrir bancada, consultar origem e voltar.
2. Instituto Horizonte: ainda na triagem, sem providências e sem peça.
3. Clara: rascunho no portal; não protocolado, jornada aberta.
4. Rafael: envio sem confirmação conclusiva; não incentivar reenvio.
5. Beatriz: cumprimento sem peça e sem protocolo.
6. Núcleo Solar: protocolo confirmado com comprovante fictício; providência concluída, processo continua no acervo.

Os filtros são visões dos mesmos itens. O percurso é informativo: clicar numa etapa mostra sua explicação, não avança o estado. Toda a simulação é apenas navegação; não há aprovação, edição, geração, confirmação de prazo ou ciência.

## Decisões ainda abertas — antes de integrar

- Onde a visão de acompanhamento deve morar: evolução da lista de intimações, da fila, ou visão unificada? O protótipo não cria um novo item no menu real.
- O resumo da intimação precisa representar várias providências, inclusive bloqueadas/concluídas, sem usar apenas a mais avançada. Os cenários são explícitos; a função demonstrativa não é uma regra de produção.
- Atribuição de elaboração e revisão: usar responsáveis existentes ou introduzir transferência formal com evento e notificação? Marina/Luan ilustram uma transferência desejada, não garantem que o backend já a suporte.
- Origem, autoria, versão e revisão devem vir de registros auditáveis. Ausência precisa aparecer como não registrada, nunca inferida como aprovação.
- Gerar peça, concluir elaboração, revisar e confirmar protocolo são marcos distintos. Uma peça pronta não conclui as outras providências.
- Caminhos de arquivamento sem ação, cancelamento, retorno à elaboração e múltiplas peças ainda precisam de uma rodada própria de prototipação.
- Antes de portar, definir critérios de conclusão e regras para envio bloqueado por providências paralelas. Nenhum gate operacional foi alterado.

## Limites técnicos

O protótipo usa estado em memória: reload reinicia os cenários; não fornece deep links nem persistência de jornada. Dados e agrupamentos não são um contrato de API. A integração futura deve preservar permissões, paginação, histórico real e distinção entre tentativa incerta e recebimento confirmado.
