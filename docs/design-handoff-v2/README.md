# Handoff: fluxo principal do AtJud (intimação → peça → assinatura → protocolo)

## Visão geral

Redesenho do fluxo de negócio central do produto: a **intimação** é a unidade de trabalho, dela derivam **providências** (que são tarefas), **prazos**, **peças**, **assinatura** e **protocolo**. O escopo cobre também as telas de suporte (dashboard, processos, tarefas, contatos, peças), o sistema de filtros, configurações, certificado A1, sign in/up e onboarding.

Problema que motivou o trabalho, nas palavras do time: *"advogado muitas vezes perde prazos porque não fica claro o que precisa ser cumprido ou não"*. Toda decisão de UX abaixo serve a isso.

Repositório de destino: `carluz-teles/autojus-fe` (Next 16 App Router, React 19, TanStack Query v5, RHF + Zod, Tailwind v4 + shadcn/ui, Clerk). Regras de arquitetura em `CLAUDE.md` (service → hook → component) valem integralmente.

## Sobre os arquivos de design

Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar estas telas no ambiente já existente do `autojus-fe`**, usando seus padrões: componentes de `src/components/ui`, shell de `src/components/shell`, features em `src/features/<f>/{services,hooks,components}`, estado de servidor no TanStack Query, formulários com RHF + Zod.

O protótipo é um único arquivo com um roteador interno por estado (`state.screen`). No app real cada tela é uma rota do App Router — não reproduza o roteador do protótipo.

## Fidelidade

**Alta fidelidade (hifi).** Todas as cores, tipografia e espaçamentos vêm dos tokens reais de `src/app/globals.css` (tema "Ledger") e da tipografia de `src/app/layout.tsx` (Geist + Fraunces). Recrie com os componentes existentes; onde o protótipo desenhou um controle que ainda não existe no repo (select com ponto de status, calendário, quadro com drag and drop), use o primitivo shadcn correspondente em vez de reimplementar do zero.

## Telas / views

### 1. Intimações — três visões da mesma lista

Rota sugerida: `/intimacoes` com a visão em query param (`?view=triagem|quadro|prazos`).

Cabeçalho: `PageHeader` com título "Intimações" e descrição "O que chegou do DJEN e o que precisa ser feito antes do prazo." Alternador de visão à direita (3 botões pill, 12,5px/500, ativo = fundo `--card` + `box-shadow` de anel).

Abaixo do cabeçalho, na ordem: barra de filtros → chips de filtros ativos → faixa de 4 KPIs (em atraso, vencem hoje, em 48h, abertas) usando `KpiCard`. **KPIs mostram sempre o total, nunca o resultado filtrado** — decisão deliberada para o usuário não perder a referência.

**Visão Triagem** (padrão) — grade `minmax(420px, 1fr) minmax(340px, 430px)`:
- Coluna esquerda: lista agrupada por urgência, na ordem *Em atraso · Vence hoje · Próximos dois dias · Esta semana · Sem providência*. Grupos vazios não são renderizados. Cabeçalho do grupo: nome + contagem + régua de 1px.
- Cada linha: grade `4px minmax(0,1fr) 128px 96px`, `border-left: 3px solid <cor da urgência>`, borda inferior de 1px, hover em `--muted`. Conteúdo: título da providência (14,5px), processo + classe (11,5px `--muted-fg`, tabular), duas pílulas de metadado (estágio, "3/4 providências"), coluna de prazo (rótulo colorido + data), coluna de responsável (avatar 22px + primeiro nome).
- Coluna direita: painel da intimação selecionada — tipo/tribunal em maiúsculas, título em Fraunces 26px, número do processo, contagem de dias em Fraunces 40px entre duas réguas, "O que aconteceu" (resumo IA), "Peças: 1 peça · rascunho", lista de providências com checkbox e link `TAR-00X`, e dois botões (Abrir intimação / Redigir peça).

**Visão Quadro** — 5 colunas (`Triagem, Peça, Revisão, Assinatura, Protocolo`), cartões com prazo em maiúsculas colorido, título, processo, contagem de providências e avatar.

**Visão Prazos** — agenda por dia (`Atrasado, Hoje, Amanhã, Sexta, Próxima semana`), grade `150px minmax(0,1fr)`, cada dia com rótulo em Fraunces 22px, data e "N prazo(s) · M responsável(is)". Dias vazios dizem "Nada vence neste dia."

### 2. Detalhe da intimação

Rota: `/intimacoes/[id]`. Usa `DetailHeader` + `DetailBody`.

- Cabeçalho: tipo · órgão (10,5px maiúsculas), título em Fraunces 34px, linha "classe · publicado em DD/MM · <link do processo>". Ações: "Sem providência" (outline) e "Redigir peça" (primary).
- **Painel de prazo** (o bloco mais importante da tela — ver "Máquina de estados do prazo" abaixo).
- Corpo em `minmax(0,1fr) 340px`:
  - "O que aconteceu" — resumo da IA, 15px/1.7.
  - "Providências derivadas" com a legenda *"Cada providência é uma tarefa atribuída — nenhuma fica sem dono nem sem prazo."* Cada item: checkbox 18px, título, descrição, chip `TAR-00X` clicável (com ícone arrow-up-right), pílula de status da tarefa, "tarefa de <responsável>", e à direita responsável + vencimento.
  - "Peças desta intimação" — linhas com tipo + versão, responsável/hora, pílula de status (Rascunho, Revisada, Assinada, Aguardando protocolo, Protocolada, Descartada), número de protocolo quando existe, seta de navegação. Vazio: "Nenhuma peça gerada para esta intimação ainda." + "+ Nova peça".
  - "Teor da publicação" — texto integral com filete à esquerda.
  - Aside: card de responsáveis (condutor do prazo, revisão e assinatura) e card de histórico.

### 3. Máquina de estados do prazo (regra de produto)

O sistema é determinístico: a regra **sugere**, o advogado **decide**. Nada se torna prazo fatal sem confirmação humana, e a decisão fica auditada. Quatro estados, todos no mesmo painel:

| Estado | Aparência | Ações |
| --- | --- | --- |
| `sugerido` | fundo `--gold` 8%, borda `--gold` 35% | Confirmar prazo · Ajustar · Não há prazo |
| `editando` | formulário inline (os botões de leitura desaparecem) | Salvar e confirmar · Cancelar |
| `confirmado` / `ajustado` | fundo verde 7%, "Fatal em" + auditoria | Editar prazo · Remover prazo |
| `ausente` | fundo `--destructive` 6% | Adicionar prazo · Marcar como mera ciência |

- No estado sugerido, mostrar a **derivação**: tipo, termo inicial, contagem e a regra aplicada ("art. 919, caput, CPC"). Quando a extração é duvidosa, exibir "confiança baixa — revise antes de confirmar" em `--destructive`.
- Formulário de ajuste: tipo de prazo (select), termo inicial (select entre os eventos reais — disponibilização, publicação, juntada), dias (número), contagem (segmented dias úteis/corridos), toggle "Prazo em dobro (art. 186 / 229, CPC)", toggle "Feriado local / suspensão forense" (+3 dias no protótipo).
- **Termo final recalcula ao vivo** (dias úteis pulando sábado/domingo) e o painel avisa o impacto: *"Ao confirmar, as providências vinculadas passam a vencer em DD/MM/AAAA."*
- Auditoria: "Confirmado por <nome> · hoje, 10:48" / "Ajustado e confirmado por…" / "Declarado sem prazo por…".

### 4. Construção da peça (`/pecas/[id]` — passo 1 de 3)

Stepper no topo: `1 Construção · 2 Assinatura · 3 Protocolo`. Grade de 3 colunas: `300px minmax(560px, 1fr) 330px`, com `min-width: 1230px` no wrapper e `overflow-x: auto` (a coluna de escrita tem piso real; não deixe o editor ser comprimido pelas laterais).

**Coluna esquerda — contexto** (nesta ordem): tipo de peça em Fraunces 19px · Intimação de origem (título linkado + tipo/publicação) · Teor da publicação (bloco com `max-height: 132px` e rolagem, filete à esquerda) · Processo (número linkado + classe, assunto, órgão, tribunal·grau, valor da causa, distribuição) · Partes (autor, réu, procuradores com OAB) · Prazo · Providências com link da tarefa · Anexos + "Anexar documento".

**Coluna central — editor**: barra WYSIWYG fixa (`position: sticky`) com seletor de bloco (Parágrafo, Título de seção, Subtítulo, Citação), B/I/U/S, 4 alinhamentos, lista com marcadores, lista numerada, recuo ±, citação, link, limpar formatação, e desfazer/refazer à direita. Papel: `--card`, borda 1px, radius 10px, `padding: 32px clamp(24px, 5vw, 56px)`, `max-width: 720px`, texto 14,5px/1.85. Rodapé: "402 palavras · 2.534 caracteres" e "Rascunho salvo há 1 min".

**Marcadores de sugestão**: cada sugestão tem número e cor próprios (1 `--gold`, 2 `oklch(0.45 0.09 230)`, 3 `--primary`), repetidos no marcador circular de 20px na **margem do papel** (`left: -28px`, nunca dentro da coluna de texto) e no cartão da sugestão. Clicar no número em qualquer lado realça o parágrafo (fundo na cor a 14% + anel de 2px). O cartão mostra "Parágrafo 3" — derive o número da posição real do parágrafo de corpo (títulos de seção não contam), não de literal.

**Coluna direita — assistente em duas abas**:
- *Sugestões*: cartões com tipo, texto, Aplicar/Descartar; rodapé fixo com "Revisar com IA" (outline) e "Regenerar minuta" (primary).
- *Chat*: thread com IA (avatar 26px, autor, hora, texto 12,5px/1.6), chips de atalho (Resumir os autos, Sugerir teses, Conferir o prazo, Encontrar precedentes) e campo de envio com botão quadrado.

### 5. Assinatura e protocolo (passos 2 e 3)

- **Assinatura**: miniatura do documento à esquerda, lista de signatários (avatar, nome, OAB · papel, estado) e botão "Assinar com certificado" → estado assinado mostra "Peça assinada com certificado A1 · data/hora".
- **Protocolo**: verificações automáticas (peça assinada por todos, anexos em PDF/A, custas, prazo ainda aberto) com ✓/○ e detalhe; "Protocolar agora" → recibo com protocolo, data/hora, processo e peça, e a frase: *"A intimação foi marcada como cumprida, as providências vinculadas foram encerradas e o prazo saiu da agenda da equipe."*

### 6. Detalhe da tarefa (estilo Linear)

Rota: `/tarefas/[id]`. Grade `minmax(0,1fr) 320px`.

- Topo: chip mono `TAR-001` + pílula de status. Título em Fraunces 30px, descrição 15px/1.7, linha de origem ("Derivada da intimação pela IA · vinculada a <intimação>").
- Duas abas: **Comentários** (conversa humana + campo "Escrever um comentário…" e botão Comentar) e **Atividade** (event log: `<autor> <evento> de <valor antigo riscado> para <valor novo>`, hora à direita).
- Aside "Propriedades" — **todas editáveis**: Status, Tipo, Prioridade, Responsável e Vencimento. Selects próprios no padrão shadcn: gatilho de **184px fixos** com ponto de cor à esquerda, valor no meio e chevron ancorado à direita (largura fixa é o que impede o ponto de dançar em opções curtas); painel `position: absolute; top: calc(100% + 4px); right: 0; z-index: 30` — nunca empurrando o conteúdo. Vencimento usa calendário (268px, navegação de mês, fim de semana em tom mudo, hoje contornado em `--gold`, selecionado preenchido em `--primary`).
- Aside "Origem": intimação, processo (ambos linkados com ícone arrow-up-right), órgão julgador e prazo da intimação. Depois, etiquetas.
- **Status é sincronizado**: mudar para "Concluída" risca a providência na intimação; marcar a providência lá reflete aqui. Fonte única obrigatória.

### 7. Cockpit do processo (`/processos/[id]`)

Segue `src/features/processos/components/cockpit/*`:
- Cabeçalho: CNJ em Fraunces 30px tabular, pílula de situação, **badge de risco** e linha de classificação; ações "Gerar peça com IA", "Nova tarefa", "···".
- Grade de metadados: Distribuição · Valor da causa · Grau · Sistema.
- Cards: Autor · Réu · Responsável interno.
- Card de **Risco** (borda esquerda na cor do nível) com os motivos determinísticos de `lib/risco.ts`, e card **Próxima providência** com tipo, contagem em Fraunces 22px, "Vence em" e link "Ver intimação de origem".
- Abas com contagem: Resumo (resumo IA + "Agora:" em caixa latão + próximos passos + dados do processo) · Andamentos (timeline TPU) · Intimações · Prazos · Tarefas (linhas com `TAR-` linkado) · Documentos.

### 8. Listas de apoio

Todas com o mesmo esqueleto: `PageHeader` → (KPIs) → (abas) → barra de filtros → chips ativos → `DataTable` → rodapé "Mostrando X de Y".

- **Processos**: abas por situação com contagem; colunas Nº (chip mono) · Processo · Classe (badge) · Órgão · Prazo a vencer (colorido pelo tom) · Responsável · Status. Linha clicável → cockpit.
- **Tarefas**: KPIs derivados dos status reais; **duas visões, Lista e Quadro**. O quadro tem 4 colunas (Aberta, Em execução, Concluída, Atrasada) com **drag and drop**: cartão arrastado fica em 45% de opacidade, coluna de destino ganha contorno tracejado e fundo `--primary` 6%, soltar muda o status de verdade (propagando para lista, KPIs e providência).
- **Peças**: KPIs por estágio; colunas Peça · Processo · Prazo · Responsável · Status. Linha → editor.
- **Contatos**: marcada como "Prévia" (como no repo); colunas Nome · Papel · Celular · Cidade · Processos · Cadastro. Sem destino ainda.

**Regras das tabelas** (aprendidas na revisão): toda coluna declara largura explícita, o wrapper usa `overflow-x: auto` com `min-width` na tabela, linhas com 64px de altura e cabeçalho com 44px. Estado vazio vai **dentro** do card, em `<td colSpan>`, e o rodapé com paginação desaparece quando não há resultado.

### 9. Sistema de filtros (duas camadas)

O advogado não pensa em filtros, pensa em perguntas. Por isso:

**Camada 1 — visões rápidas**: chips sempre visíveis, um clique, alternáveis.
- Intimações: Em atraso · Vencem hoje · Minhas · **Sem providência**
- Processos: Com prazo em atraso · Prazo em 48h · Meus processos · Sem prazo aberto
- Tarefas: Atrasadas · Vencem hoje · Minhas · Próximas 48h
- Peças: Prazo em atraso · Prazo hoje · Minhas · Aguardando assinatura
- Contatos: Clientes · Partes contrárias

**Camada 2 — drawer de filtros** (padrão `Sheet` + `Select`), botão com contador e chips removíveis do que está aplicado:
- Universais: **Responsável**, **Prazo** (em atraso / vence hoje / próximas 48h / próximos 7 dias / sem prazo), **Status**, busca textual
- Intimações: + Etapa do peticionamento, Órgão julgador, Classe
- Processos: + Situação, Classe, Órgão
- Tarefas: + Prioridade · Peças: + Tipo de peça · Contatos: Papel, Cidade

Deixados de fora de propósito: período de publicação e OAB monitorada (raros no uso diário) e filtro por cliente (depende do `contact` first-class, que é v1).

### 10. Configurações

Abas com sublinhado em `--primary` (padrão `settings-nav.tsx`): **Organização · Tribunais · Termos · Certificado · Cobrança · Notificações · Perfil**.

- **Organização**: dados do escritório + membros e convites (avatar, nome/e-mail, papel, estado Ativo/Convidado).
- **Tribunais** (era "Integrações"): DJEN e DATAJUD **não aparecem como cards** — rodam sozinhos a partir das OABs, e isso é dito numa faixa verde no topo. Ficam só os acessos que exigem ação: Eproc·TJSP (credenciamento pendente), Projudi·TJPR (não conectado). Abaixo, histórico de reconciliações.
- **Termos**: cada inscrição é um **cartão** — `TITULAR — 347019/SP` + pílula "SEM CERTIFICADO" quando falta, e linhas de diários alcançados com círculo de ativar/pausar e badges de fonte (DJEN, Diário oficial). Campo aceita `SP999888` ou `999888/SP` e cria o cartão com o diário da UF. Estado vazio: "Nenhuma inscrição monitorada — sem OAB não há captura."
- **Certificado** (ver seção própria abaixo).
- **Cobrança**: plano, uso no ciclo com barras (processos, OABs, peças, usuários) e faturas.
- **Notificações**: matriz aviso × canal — **só App e E-mail** (WhatsApp foi descartado). Sete avisos: intimação nova, prazo em 3 dias, prazo vencendo hoje, tarefa atribuída, peça aguardando revisão, protocolo concluído, falha de importação.
- **Perfil**: dados + segurança (senha, 2FA exigida para protocolar).

### 11. Certificado A1 — aba própria

Racional: o A1 não é integração, é **identidade jurídica**. O `.pfx` + senha permite assinar e protocolar no nome do advogado; vazamento é dano irreversível e vencimento silencioso quebra no dia do prazo. Portanto: por usuário (nunca do escritório), validação explícita antes de ativar, registro de todo uso.

- **Seu certificado**: titular, CPF mascarado, OAB, tipo, emissor/cadeia, validade + dias restantes, impressão digital.
- **Instalação em 4 passos**: Arquivo (.pfx/.p12, avisando que e-CNPJ não assina peças e que nem admin consegue baixar de volta) → Senha + política → **Validação explícita** (titular confere com a conta? OAB entre as monitoradas? cadeia confiável e não revogada? vence em quantos dias? tipo correto?) → Consentimento com escopo e termo de responsabilidade. "Voltar" não aparece no primeiro passo; "Continuar" não aparece no último.
- **Política de senha**: pedir a cada assinatura / manter liberado 30 min / cofre gerenciado com 2FA — cada opção explicando o trade-off. *Decisão pendente: se a Fase 1 não terá cofre, remover a terceira opção para não prometer o que não entrega.*
- **Escopo**: assinar peças · protocolar em seu nome · assinar procurações (separados de propósito — protocolar é mais perigoso que assinar).
- **Registro de uso**: data, ato, processo, IP.
- **Certificados da equipe**: admin vê estado, nunca o arquivo; destaca "Vence em 44 dias" e quem está "Ausente" (não assina nem protocola).
- **Zona de risco**: remoção exige digitar `REMOVER` e explica a consequência.

### 12. Sign in, sign up e onboarding

Fora do shell (sem sidebar/header), centralizado, seguindo `(auth)/layout.tsx`: wordmark `jus·assessoria` (ponto em `--gold`), headline "Sua assessoria jurídica, no automático." e subtítulo "Monitore processos, prazos e publicações em um só lugar."

- **Entrar** (400px): e-mail, senha com "Esqueci", botão primário, divisor "ou", "Continuar com Google", link "Criar conta".
- **Criar conta**: nome, e-mail profissional, senha (regra visível), aviso de termos, link "Entrar".
- **Onboarding** (560px, card com filete de latão de 2px no topo): stepper `1 Sua empresa · 2 Seus processos · 3 Seu time`, com a linguagem exata de `src/features/onboarding/copy.ts` ("Vamos configurar sua conta", "Três passos rápidos para os seus processos chegarem sozinhos", Voltar/Continuar/Pular/Concluir).
  - Passo 1: CNPJ (com auto-preenchimento), nome, e-mail, telefone.
  - Passo 2: **mesmos componentes de Termos** (cartão por inscrição + diários) e a **mesma fonte de dados** — o que se cadastra aqui aparece em Configurações › Termos. Sem checkbox de fontes. Custo de pular explícito no rodapé.
  - Passo 3: convites (e-mail + papel, lista, "Os convites são enviados quando você concluir").

## Interações & comportamento

- **Navegação circular fechada**: lista → processo → intimação → tarefa → processo. Todo link cruzado carrega ícone arrow-up-right (Lucide) para se anunciar como link.
- Linhas de tabela clicáveis levam ao detalhe (`cursor: pointer`); Contatos é a exceção.
- Drag and drop no quadro de Tarefas (HTML5 DnD): `dragstart` guarda o item, `dragover` destaca a coluna, `drop` grava o status.
- Popovers (selects, calendário) são absolutos, com z-index acima do conteúdo, e fecham ao escolher.
- Filtros são combináveis; estado vazio sempre oferece "Limpar filtros".
- Transições: apenas `background .15s` em hovers e o `reveal` do repo. Sem animação decorativa.

## Estado necessário

Por tela: visão ativa (triagem/quadro/prazos, lista/quadro), item selecionado, busca, visão rápida, mapa de filtros por tela, drawer aberto, aba ativa (detalhe do processo, assistente, tarefa, configurações), passo do wizard (peça, certificado, onboarding), popover aberto e deslocamento do mês do calendário.

Servidor (TanStack Query, conforme `CLAUDE.md`): intimações + summary, processos + summary + prazos, tasks + summary, peças, documentos, membros da org, termos monitorados, importações/reconciliações, plano e faturas, preferências de notificação, certificado (metadados apenas).

**Duas regras de dados que a revisão cobrou repetidamente:**
1. **Providência = tarefa.** Uma providência nunca existe sem tarefa associada; código, dono, vencimento e status vêm da tarefa.
2. **Fonte única.** Status/responsável/vencimento editados no detalhe da tarefa precisam aparecer iguais na lista de tarefas, no quadro, na aba Tarefas do processo e nas providências da intimação. Badges de contagem na sidebar derivam dos mesmos dados das listas — nada de literais.

## Design tokens

Todos já existem em `src/app/globals.css` (tema "Ledger", modo claro). Valores usados no protótipo:

| Token | Valor |
| --- | --- |
| `--background` | `oklch(0.985 0.006 95)` |
| `--foreground` | `oklch(0.24 0.02 165)` |
| `--card` | `oklch(0.995 0.004 95)` |
| `--muted` | `oklch(0.955 0.008 95)` |
| `--muted-foreground` | `oklch(0.49 0.02 165)` |
| `--primary` | `oklch(0.42 0.068 168)` |
| `--primary-foreground` | `oklch(0.98 0.012 95)` |
| `--gold` | `oklch(0.72 0.11 76)` |
| `--destructive` | `oklch(0.55 0.2 27)` |
| `--border` / `--input` | `oklch(0.9 0.012 90)` |
| `--sidebar` | `oklch(0.972 0.01 100)` |
| `--sidebar-accent` | `oklch(0.93 0.022 100)` |
| `--radius` | `0.625rem` (cards 14px, controles 10px, chips 8px) |

Tons semânticos seguem `status-badge.tsx`: neutral `--muted`, info sky `oklch(0.45 0.09 230)`, warning `--gold`, danger `--destructive`, success `oklch(0.45 0.1 150)`. Sempre fundo a 10-12% + texto no tom escuro.

**Tipografia**: Geist para interface (13-14,5px corpo, 11px maiúsculas de rótulo com `letter-spacing: .06-.12em`), Fraunces (`font-display`) para títulos e números grandes — 30px em títulos de página, 26px em títulos de card, 22-40px em contagens. Números sempre `font-variant-numeric: tabular-nums` em datas, processos, contagens e tabelas.

**Elevação**: `box-shadow: var(--ring1), 0 1px 2px oklch(0.24 0.02 165 / 6%)` onde `--ring1 = 0 0 0 1px oklch(0.24 0.02 165 / 10%)` (equivalente ao `ring-1 ring-foreground/10` do repo). Popovers: `0 10px 28px oklch(0.24 0.02 165 / 14%)`.

**Ícones**: Lucide, 15-16px, `stroke-width: 1.8`, `currentColor`.

## Assets

Nenhum asset binário. Todos os ícones são inline SVG de Lucide (já é a lib do repo). A marca é tipográfica: quadrado 32px `--primary` com "j" em Fraunces e anel de latão, mais o wordmark `jus·assessoria` — igual a `brand-mark.tsx`.

## Arquivos

- `Atjus Fluxo v2.dc.html` — protótipo completo e atual (todas as telas descritas acima). É a referência a seguir.
- `Atjus Fluxo.dc.html` — primeira versão, em outra linguagem visual (Classical). Mantida apenas como histórico; **não** use como referência.
- `github.md` — associação com o repositório e o mapa de tela → arquivos do repo que embasaram cada uma.

## Mapa de tela → arquivos do repositório

| Tela | Arquivos a modificar/criar |
| --- | --- |
| Shell, sidebar, header | `src/components/shell/{app-shell,sidebar,nav-link,nav-config,sidebar-footer,user-menu,breadcrumb-context}.tsx` |
| Intimações (3 visões) | `src/app/(app)/intimacoes/page.tsx`, `src/features/intimacoes/` |
| Detalhe da intimação + prazo | `src/app/(app)/intimacoes/[id]/`, `src/features/intimacoes/`, `src/features/prazos/` |
| Peça (construção/assinatura/protocolo) | `src/features/pecas/`, `src/components/ui/ia-panel.tsx` |
| Detalhe da tarefa | `src/app/(app)/tarefas/[id]/`, `src/features/tasks/`, `src/components/ui/detail-layout.tsx` |
| Cockpit do processo | `src/features/processos/components/cockpit/*`, `lib/risco.ts` |
| Listas | `src/components/ui/{data-table,kpi-card,status-badge,filter-toolbar,list-pagination,sheet}.tsx` |
| Configurações | `src/app/(app)/settings/*`, `src/components/shell/settings-nav.tsx`, `src/features/{integrations,organization,notifications}/` |
| Certificado A1 | nova feature `src/features/certificado/` + aba em settings |
| Auth e onboarding | `src/app/(auth)/`, `src/features/onboarding/` |

## Decisões pendentes para o time

1. **Cofre gerenciado de certificado** existe na Fase 1? Se não, remover a opção da política de senha.
2. **Bloquear "Marcar como resolvida"** na intimação enquanto houver tarefa aberta? A regra providência=tarefa aponta para sim.
3. **Indicador "prazo não confirmado"** na lista de intimações, para a triagem mostrar o que ainda depende de decisão humana.
4. Detalhe de **Contato** não foi desenhado (a tela segue como Prévia, como no repo).
