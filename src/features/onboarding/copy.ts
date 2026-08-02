// Fonte ÚNICA da linguagem e dos passos do onboarding. Nenhum componente/hook da
// feature declara string solta: mudar um texto = mudar aqui (tom consistente,
// revisão num lugar só). Os passos são a config que o wizard renderiza.
//
// Desenho do fluxo (decisão de produto): o sign-up do Clerk já coleta o nome, e a
// foto vive no /profile — então o wizard vai direto ao que gera valor: a empresa
// (tenant), os processos (OAB/fontes — o "aha" do produto) e o time (cada advogado
// convidado traz a própria OAB → mais processos monitorados).

export const ONBOARDING_STEPS = [
  { id: 1, label: "Sua empresa" },
  { id: 2, label: "Seus processos" },
  { id: 3, label: "Seu time" },
] as const;

export const onboardingCopy = {
  page: {
    title: "Vamos configurar sua conta",
    subtitle: "Três passos rápidos para os seus processos chegarem sozinhos.",
  },
  stepper: {
    aria: "Progresso do onboarding",
  },
  common: {
    back: "Voltar",
    next: "Continuar",
    finish: "Concluir",
    skip: "Pular",
    saving: "Salvando…",
    preparing: "Preparando…",
  },
  company: {
    title: "Sua empresa",
    description: "Os dados do escritório que você representa.",
    logo: {
      alt: "Logo da organização",
      edit: "Editar logo",
      hint: "Aparece para o seu time e nos documentos.",
    },
    fields: {
      cnpj: {
        label: "CNPJ",
        placeholder: "00.000.000/0000-00",
        help: "Preenchemos os dados automaticamente ao sair do campo.",
        searching: "Buscando dados da empresa…",
        invalid: "CNPJ deve ter 14 dígitos.",
        lookupFailed: "Não foi possível buscar o CNPJ, preencha manualmente.",
      },
      phone: {
        label: "Telefone",
        placeholder: "(11) 3000-0000",
        invalid: "Telefone com 10 ou 11 dígitos.",
      },
      name: {
        label: "Nome da empresa",
        required: "Informe o nome da empresa.",
      },
      email: {
        label: "E-mail da organização",
        placeholder: "contato@escritorio.com.br",
        invalid: "Informe um e-mail válido.",
      },
      address: {
        legend: "Endereço",
        add: "Adicionar endereço",
        remove: "Remover endereço",
        incomplete: "Complete o endereço ou remova a seção.",
        cep: {
          label: "CEP",
          placeholder: "00000-000",
          invalid: "CEP inválido.",
        },
        logradouro: { label: "Logradouro", required: "Informe o logradouro." },
        numero: { label: "Número" },
        complemento: { label: "Complemento" },
        bairro: { label: "Bairro" },
        cidade: { label: "Cidade", required: "Informe a cidade." },
        uf: {
          label: "UF",
          placeholder: "UF",
          invalid: "Selecione a UF.",
        },
      },
    },
    orgError: "Não foi possível criar sua organização. Tente novamente.",
    profileError: "Não foi possível salvar o perfil. Tente novamente.",
    timeout:
      "Está demorando mais que o esperado para preparar sua conta. Tente novamente em instantes.",
    preparingAccount: "Preparando sua conta…",
  },
  processes: {
    title: "Seus processos",
    description:
      "Informe as OABs do escritório e conecte a fonte — seus processos passam a chegar e atualizar sozinhos.",
    skipCost:
      "Dá para ativar depois em Integrações — até lá, nenhum processo é monitorado.",
  },
  team: {
    title: "Convide seu time",
    description:
      "Cada advogado convidado traz a própria OAB — mais processos monitorados no escritório.",
    fields: {
      email: {
        label: "E-mail do convidado",
        placeholder: "advogado@escritorio.com",
        invalid: "Informe um e-mail válido.",
        duplicate: "Esse e-mail já está na lista.",
      },
      role: { label: "Papel" },
    },
    add: "Adicionar",
    stagedHint: "Os convites são enviados quando você concluir.",
    sending: "Enviando convites…",
    sendError:
      "Não foi possível enviar alguns convites — os pendentes seguem na lista. Tente novamente.",
  },
} as const;
