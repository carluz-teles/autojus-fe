# Design — Card "Providências" (revisão da Fatia costura Providência→Tarefa→Minuta)

> **Origem**: 2 mockups (imagens) enviados pelo usuário em 2026-09-01, descritos aqui literalmente porque
> subagentes de implementação não têm acesso a imagens do chat (só a este arquivo). Este documento É a fonte
> de verdade visual — bate as decisões de UX que substituem o rascunho inicial que eu (orquestrador) tinha
> passado antes de ver os mockups. Onde este doc divergir do que já foi implementado em
> `analisar-card.tsx`/`use-intimacoes.ts`, ESTE DOC VENCE.
>
> **v1.1 (2026-09-01, correções do usuário sobre o mockup original)**: o usuário simplificou o mockup depois de
> revisado — os itens abaixo marcados **[REMOVIDO v1.1]** faziam parte do mockup original mas NÃO devem ser
> construídos. Leia a v1.1 como a versão vinculante; o texto v1 fica só de histórico/contexto.

---

## Contexto geral

O card se chama **"Providências"** (não mais "Analisar esta intimação" como título principal — o ✨ + "Providências"
substitui o header antigo quando já há análise). Ele tem DOIS ESTADOS observados nos mockups: **pré-criação de
tarefas** (imagem 1) e **pós-criação de tarefas** (imagem 2) — a estrutura do card é idêntica, só a coluna de ação de
cada linha muda.

## Header do card

- Ícone ✨ (sparkles) + título **"Providências"** (bold, ~15px).
- Subtítulo inline, cinza/muted, menor: **"geradas pela IA · revise antes de executar"**.
- Contador no canto superior direito: número solto (ex: **"3"**) = quantidade de providências (mesmo estilo
  discreto que o contador atual do card, cinza, tabular-nums).

## Breadcrumb / stepper de contexto — **[REMOVIDO v1.1]**

~~Uma trilha horizontal "1 · Ato: X > 2 · Prazo: Y > 3 · Providências" abaixo do header.~~ **Não construir.** O
usuário decidiu que o card não precisa desse contexto de Ato/Prazo — vai direto do header pra faixa de aviso/lista.

## Faixa de aviso/explicação (bloco com fundo levemente destacado)

Um bloco de texto com fundo sutilmente diferenciado (mesmo tom claro usado em avisos informativos no resto do
app), contendo uma versão SIMPLIFICADA do texto original (sem "A apurar"/"triagem" — ver remoção abaixo):

> "Cada providência vira uma **tarefa**, vinculada ao prazo que já existe (fatal {data_fatal}). Confirme para
> criar a tarefa, ou descarte se não se aplica."

- A palavra **tarefa** em negrito/destaque; o resto texto corrido normal.
- `{data_fatal}` é a data final do prazo (`i.prazo.end_date`, formatada dd/mm) — omitir a menção ao prazo se a
  intimação não tiver `i.prazo` (nem toda providência tem prazo vinculado).
- À direita desse bloco, um botão **"Criar todas"** (fundo verde sólido, texto branco) — ação em lote que
  confirma/materializa TODAS as providências pendentes de uma vez (dispara N chamadas ao endpoint de confirmar,
  uma por providência sem `task_id` ainda — client-side, não precisa de endpoint de bulk no BE agora).
  - Esse botão continua visível mesmo no estado pós-criação (imagem 2) — não desaparece quando já há tarefas
    criadas (idempotente: reconfirmar um item que já tem tarefa é um no-op seguro no BE).
  - **(v1.1)** "Criar todas" NÃO descarta nada — só confirma/cria tarefa pros itens pendentes. Descarte continua
    sendo uma decisão por item (botão "Descartar" na linha, ver abaixo).

## Lista de providências (uma linha por item)

Cada linha tem, na coluna esquerda:
1. **Título** em negrito (~14px) — rótulo em PT derivado do `tipo` do action_item (mapa local, ex:
   `contestar→"Redigir Contestação"`, mas repare que o mockup usa frases mais ricas que o `tipo` cru sozinho não
   dá — ex: "Juntar procuração e documentos", "Dar ciência ao cliente". Como o backend NÃO persiste
   título/descrição no `action_item` (só no candidato efêmero da análise, que se perde depois), a estratégia
   recomendada é: usar o candidato efêmero (`AnaliseProvidenciaView.title`/`.description`) capturado no momento da
   análise para preencher o título/descrição da UI enquanto a sessão do usuário estiver viva (guardar num cache/
   estado local por `tipo`, já que não há id ainda nesse momento — chavear por posição/tipo na resposta da
   análise), e cair num rótulo genérico derivado de `tipo` como fallback quando o usuário reabre a tela depois
   (após reload, sem o candidato efêmero em mãos). Documentar esse fallback claramente no código.
2. **Descrição** (~13px, cinza) — mesma lógica de origem do dado acima (efêmero da análise, fallback genérico).
3. Badges/tags, da esquerda pra direita:
   - **"Peça"** (fundo azul clarinho) quando `gera_peca=true`, OU **"Ciência"** (fundo verde clarinho) quando
     `gera_peca=false`.
   - **"fluxo curto"** (fundo cinza neutro) — aparece SÓ nos itens `gera_peca=false` (Ciência). É um rótulo
     estático de apresentação (não vem de nenhum campo novo do BE — é derivado no FE: todo item Ciência é
     "fluxo curto"). Mantido — só o "A apurar" foi removido, este badge continua.
   - ~~**"● A apurar"**~~ — **[REMOVIDO v1.1]**. Não mostrar nenhum badge de status/confiança na linha. A
     distinção declarado/ia/manual (`tipo_origem`/`tipo_status`) NÃO aparece visualmente neste card — nem como
     badge uniforme, nem diferenciada. É dado interno do BE, não vira UI aqui.

Na coluna direita de cada linha (a AÇÃO), dois estados:

### Estado PRÉ (imagem 1) — item ainda sem `task_id`
Dois botões lado a lado:
- **"+ Criar tarefa"** (outline, ícone "+" à esquerda) — chama `POST /v1/action-items/:id/confirmar`. Funciona
  tanto pra item `tipo_origem=ia` (promove a_confirmar→confiável) quanto pra item já `tipo_origem=declarado` (é
  um no-op idempotente no BE, mas do ponto de vista da UI o efeito é o mesmo: a tarefa nasce/aparece pouco
  depois). Um único botão, um único endpoint, sempre — sem distinção de fluxo entre declarado/ia no clique.
- **"Descartar"** (ghost/texto, ao lado do "Criar tarefa") — **[ADICIONADO v1.1]** chama
  `POST /v1/action-items/:id/descartar`. Ao suceder, o item marca `status=DISCARDED` e some da lista (mesmo
  comportamento de filtro que o card já tinha antes desta fatia: itens DISCARDED nunca aparecem).
- Ambos desabilitados enquanto qualquer uma das duas mutations estiver em voo (mesmo padrão de `emVoo` que já
  existe no componente atual).

### Estado PÓS (imagem 2) — item já com `task_id`
- Se `gera_peca=true`: botão **"⚙ Gerar minuta"** (ícone de engrenagem, outline) — aciona a criação da peça a
  partir da tarefa (`POST /v1/pecas {task_id}`).
- Se `gera_peca=false`: ~~texto simples cinza **"no fluxo"**~~ — **[REMOVIDO v1.1]**. Não mostrar nenhum texto no
  lugar do botão — a linha de um item Ciência confirmado mostra SÓ a pílula de referência da tarefo (abaixo),
  sem botão de ação nenhum (não tem peça pra gerar, então não tem 2º elemento nessa coluna).
- Em AMBOS os casos, abaixo/ao lado, uma pílula verde com check: **"✓ T-{código}"** — referência da tarefa criada.
  - O mockup mostra códigos sequenciais tipo "T-1003"/"T-1004"/"T-1005". O código atual do projeto
    (`codigoTarefa`, em `analisar-card.tsx`) gera `TAR-XXXX` a partir dos 4 primeiros chars do UUID da tarefa —
    ESSE é o dado real disponível (não existe contador sequencial no BE). Ao implementar: **reusar a função
    `codigoTarefa` já existente, só trocando o prefixo de exibição pra `"T-"` em vez de `"TAR-"`** (ajuste
    cosmético mínimo) — NÃO inventar/implementar um contador sequencial novo no BE só pra bater o mockup
    literalmente; é fora de escopo desta fatia. Documentar essa divergência conhecida (código real é derivado do
    uuid, não sequencial) no comentário do componente.

## Timing/assincronia (reforça o que já foi combinado antes deste mockup chegar)

Como a criação da tarefa é assíncrona (evento, ~1-2s de atraso), a transição de "+ Criar tarefa" pra "✓ T-XXXX"
não é instantânea — a linha deve mostrar um estado intermediário de carregamento (ex: manter o botão desabilitado
com spinner, ou trocar brevemente por "Criando tarefa…") enquanto aguarda o `task_id` aparecer via poll curto
(mesmo mecanismo de polling com auto-off já combinado antes deste mockup).

## Fora de escopo deste ajuste visual (não construir agora)

- Breadcrumb Ato→Prazo→Providências — removido pelo usuário (v1.1), não construir.
- Badge "A apurar" (uniforme ou diferenciado por tipo_origem) — removido pelo usuário (v1.1), não construir.
- Texto "no fluxo" no estado pós-criação de itens Ciência — removido pelo usuário (v1.1), não construir.
- Botão/fluxo de "Reclassificar tipo" — os mockups NÃO mostram essa ação neste card. A reclassificação
  (`POST /v1/action-items/:id/reclassificar`) pode ficar em outro lugar da UI (ex: detalhe da tarefa/peça) — não
  forçar um Select de piece_profile dentro desta lista.
