export const landingNavigation = [
  { href: "#acervo", label: "Acervo conectado" },
  { href: "#plataforma", label: "Providências" },
  { href: "#inteligencia", label: "Minutas inteligentes" },
  { href: "#assistente", label: "Chat jurídico" },
] as const;

export const workflow = [
  {
    number: "01",
    label: "Acompanhe",
    title: "Seu acervo se atualiza todos os dias.",
    description:
      "Novos processos, intimações e movimentações chegam pela captura diária das OABs monitoradas. DJEN e DataJud reúnem as informações para você começar com contexto.",
    detail: "Fontes públicas. Sem senha de tribunal.",
  },
  {
    number: "02",
    label: "Receba as providências",
    title: "A IA identifica o que fazer.",
    description:
      "O AtJud analisa a intimação e gera as providências automaticamente. Distingue mera ciência de atos que exigem trabalho e reconhece cumprimento no histórico disponível.",
    detail: "A triagem inicial já vem feita.",
  },
  {
    number: "03",
    label: "Construa",
    title: "Sua minuta começa com contexto.",
    description:
      "O teor, os documentos e as teses selecionadas orientam uma minuta estruturada para o caso. Você revisa os fundamentos e avança direto para o refinamento.",
    detail: "Argumentos ligados ao caso concreto.",
  },
  {
    number: "04",
    label: "Refine e confira",
    title: "Converse. Ajuste. Decida.",
    description:
      "Peça um resumo, esclareça um ponto dos autos ou ajuste o tom no chat. Aceite as melhorias que fizerem sentido e confira a versão final antes de avançar.",
    detail: "Seu critério em cada alteração.",
  },
] as const;

export const faqs = [
  {
    question: "Novos processos e intimações chegam todos os dias?",
    answer:
      "Sim. A captura diária acompanha as OABs cadastradas e incorpora os novos processos, publicações e movimentações encontrados nas fontes monitoradas. A disponibilidade acompanha a publicação e a atualização dessas fontes. A plataforma possui avisos de importação, prazos e atribuições; a ingestão atual não envia uma notificação individual para cada processo, intimação ou andamento recebido.",
  },
  {
    question: "O AtJud centraliza processos e autos automaticamente?",
    answer:
      "O acompanhamento pelas OABs traz processos e publicações ao AtJud, e o DataJud complementa o histórico disponível. Com a conexão de tribunal configurada, os autos podem ser importados e vinculados ao processo. Assim, você consulta publicações, movimentações e documentos no mesmo acervo, que também alimenta a triagem, a minuta e o chat. A cobertura dos autos depende da integração e do acesso ao tribunal.",
  },
  {
    question: "As providências são geradas automaticamente?",
    answer:
      "Sim. O AtJud analisa o teor da intimação e o contexto disponível, identifica o ato solicitado e gera as providências. A classificação distingue mera ciência de situações que exigem atuação, como uma manifestação. Movimentos de resposta no histórico também permitem reconhecer cumprimento. Você recebe a triagem inicial pronta e pode conferir ou corrigir a classificação quando necessário.",
  },
  {
    question: "Preciso ler todos os autos para começar a triagem?",
    answer:
      "Você não precisa reconstruir manualmente o contexto para iniciar a triagem. O AtJud organiza o que a intimação comunica, os próximos passos e os sinais de cumprimento encontrados. A análise usa o teor, o histórico e os documentos disponíveis; a conferência profissional continua importante para decidir como atuar no caso.",
  },
  {
    question: "O que posso pedir ao chat jurídico?",
    answer:
      "Peça um resumo de um documento ou do processo, esclareça o teor da intimação, analise pontos da minuta e solicite melhorias de redação. Você pode pedir um texto mais objetivo, técnico ou enfático. As respostas baseadas em documentos trazem referências para conferência; alterações são propostas para sua aprovação. Quando falta informação, o assistente deve indicar a lacuna.",
  },
  {
    question: "Preciso compartilhar minha senha do tribunal?",
    answer:
      "Para acompanhar publicações do DJEN e consultar os dados públicos do DataJud, não. Você informa as OABs que deseja monitorar. A importação de autos e a preparação de rascunhos em portais são etapas separadas e podem exigir conexão, certificado A1 ou autenticação, conforme o tribunal.",
  },
  {
    question: "Como o AtJud chega à data de um prazo?",
    answer:
      "O motor considera o regime de contagem, os dias úteis, o recesso e os feriados cadastrados na base utilizada. A memória de cálculo permite conferir as datas e os critérios aplicados. Prazos que exigem apuração ou apresentam divergências ficam sinalizados para a equipe confirmar ou ajustar.",
  },
  {
    question: "A IA consegue trabalhar com os documentos do meu processo?",
    answer:
      "Sim. A geração e o assistente utilizam os documentos importados ou enviados ao processo que já foram extraídos e indexados. As referências permitem voltar ao documento e à página de origem. A cobertura depende do material disponível: o que não foi sustentado pelas fontes precisa de verificação do advogado.",
  },
  {
    question: "O sistema já assina e protocola sozinho?",
    answer:
      "A integração atual prepara e salva o rascunho no e-SAJ/TJSP, com a peça e os anexos, para conferência. A assinatura e o protocolo definitivo estão bloqueados nessa etapa. O envio final e o comprovante fazem parte da evolução do fluxo; a preparação de um rascunho não é apresentada como protocolo realizado.",
  },
  {
    question: "O AtJud aprende automaticamente o estilo do escritório?",
    answer:
      "Hoje, você orienta a geração, escolhe teses e refina a redação com o assistente. Os perfis de peça ajudam a organizar a estrutura. A personalização automática pela voz do escritório e o aprendizado com os resultados das petições fazem parte da evolução prevista do produto.",
  },
  {
    question: "Como começo a organizar meu escritório?",
    answer:
      "Crie sua conta, configure os dados do escritório e cadastre as OABs para iniciar o acompanhamento. Depois, convide a equipe, distribua as providências e conecte os portais disponíveis quando precisar importar autos. As condições de assinatura e os limites são apresentados dentro da plataforma.",
  },
] as const;

/** Fictional, deterministic examples. Never sourced from tenant data. */
export const demoNotifications = [
  {
    id: "manifestacao",
    title: "Redigir manifestação",
    process: "Processo ilustrativo · Cível",
    time: "Providência gerada pela IA",
    initials: "AM",
    person: "Ana Martins",
    status: "Exige atuação",
    badgeVariant: "warning",
    description:
      "O teor pede uma resposta aos documentos juntados. O AtJud identificou o ato e gerou a providência: redigir a manifestação com o contexto do processo.",
    document: "Despacho",
    page: "3",
    quote:
      "Intime-se a parte autora para manifestação sobre os documentos apresentados.",
    tag: "Manifestação necessária",
  },
  {
    id: "ciencia",
    title: "Ciência de redistribuição",
    process: "Processo ilustrativo · Consumidor",
    time: "Sem ato a cumprir identificado",
    initials: "RC",
    person: "Rafael Costa",
    status: "Mera ciência",
    badgeVariant: "secondary",
    description:
      "A comunicação informa a redistribuição, sem exigir manifestação. O AtJud classifica o ato como mera ciência para você concentrar a atenção no que demanda trabalho.",
    document: "Ato de comunicação",
    page: "1",
    quote:
      "Dê-se ciência às partes da redistribuição, sem determinação de manifestação.",
    tag: "Comunicação identificada",
  },
  {
    id: "cumprida",
    title: "Manifestação já apresentada",
    process: "Processo ilustrativo · Contratos",
    time: "Resposta localizada no histórico",
    initials: "BL",
    person: "Beatriz Lima",
    status: "Cumprimento identificado",
    badgeVariant: "success",
    description:
      "Um movimento de resposta foi localizado no histórico disponível, permitindo reconhecer o cumprimento. O AtJud atualiza a situação do prazo e mantém o contexto para sua conferência.",
    document: "Movimentação processual",
    page: "1",
    quote: "Juntada de petição de manifestação.",
    tag: "Trabalho já realizado",
  },
] as const;

export const chatExamples = [
  {
    id: "autos",
    label: "Resumir um documento",
    kind: "LEITURA DOS AUTOS",
    question: "Resuma o contrato e destaque o que merece atenção.",
    answer:
      "O contrato define o serviço e vincula seu escopo ao anexo. Antes de concluir a análise, confira esse anexo: ele detalha o que foi contratado.",
    source: "Contrato · página 4",
    quote:
      "O presente contrato tem por objeto a prestação dos serviços descritos no anexo.",
    note: "O resumo fica conectado ao documento de origem.",
  },
  {
    id: "processo",
    label: "Entender o processo",
    kind: "CONTEXTO PROCESSUAL",
    question: "O que aconteceu no processo e qual é o próximo passo?",
    answer:
      "A parte autora foi intimada a se manifestar sobre os documentos apresentados. O próximo passo é analisar esse material e preparar a manifestação. O prazo deve ser conferido no painel da intimação.",
    source: "Despacho · página 3",
    quote:
      "Intime-se a parte autora para manifestação sobre os documentos apresentados.",
    note: "Histórico, teor e documentos ajudam a orientar a resposta.",
  },
  {
    id: "tom",
    label: "Ajustar o tom",
    kind: "REDAÇÃO MAIS ENFÁTICA",
    question: "Deixe este pedido mais enfático, preservando o fundamento.",
    original: "Pedimos que os documentos apresentados sejam analisados.",
    answer:
      "Requer-se a análise expressa dos documentos apresentados, com o enfrentamento dos pontos relevantes para a apreciação do pedido.",
    source: "Minuta em elaboração · seção Pedidos",
    quote: "Pedimos que os documentos apresentados sejam analisados.",
    note: "Sugestão de redação. A alteração depende da sua aprovação.",
  },
  {
    id: "revisao",
    label: "Revisar a minuta",
    kind: "ASSISTÊNCIA JURÍDICA",
    question: "Que ponto desta minuta ainda precisa de comprovação?",
    answer:
      "A minuta afirma que o serviço foi entregue. O trecho do contrato consultado define o objeto, mas não comprova a entrega. Confira um comprovante nos autos antes de manter essa afirmação como fato.",
    source: "Contrato · página 4",
    quote:
      "O presente contrato tem por objeto a prestação dos serviços descritos no anexo.",
    note: "Falta de comprovação identificada para sua conferência.",
  },
] as const;

/** September 2026 begins on Tuesday; the dates below are demonstration data. */
export const demoCalendar = Array.from({ length: 35 }, (_, index) => {
  const day = index - 1;
  const inMonth = day > 0 && day <= 30;
  const hasDeadline = [11, 15, 18, 22].includes(day);
  return {
    id: index,
    label: inMonth ? String(day) : "",
    current: day === 9,
    hasDeadline,
    weekend: index % 7 === 0 || index % 7 === 6,
    description: inMonth
      ? `${day} de setembro${hasDeadline ? ", entrega ilustrativa" : ""}`
      : undefined,
  };
});
