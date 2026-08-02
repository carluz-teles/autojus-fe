// Fonte ÚNICA da linguagem e dos passos do onboarding. Nenhum componente/hook da
// feature declara string solta: mudar um texto = mudar aqui (tom consistente,
// revisão num lugar só). Os passos são a config que o wizard renderiza.

export const ONBOARDING_STEPS = [
  { id: 1, label: "Seus dados" },
  { id: 2, label: "Sua empresa" },
  { id: 3, label: "Fontes" },
] as const;

export const onboardingCopy = {
  page: {
    title: "Vamos configurar sua conta",
    subtitle: "Três passos rápidos para começar a monitorar seus processos.",
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
  step1: {
    title: "Seus dados",
    description: "Como você aparece para o seu escritório.",
    photo: {
      alt: "Sua foto",
      edit: "Editar foto",
      hint: "Sua foto aparece para os membros do escritório.",
      error: "Não foi possível enviar a foto. Tente novamente.",
    },
    fields: {
      firstName: { label: "Nome", required: "Informe seu nome." },
      lastName: { label: "Sobrenome", required: "Informe seu sobrenome." },
    },
    submitError:
      "Não foi possível salvar seus dados. Tente novamente em instantes.",
  },
  step2: {
    title: "Sua empresa",
    description: "Os dados do escritório que você representa.",
    fields: {
      cnpj: {
        label: "CNPJ",
        placeholder: "00.000.000/0000-00",
        help: "Preenchemos os dados automaticamente ao sair do campo.",
        searching: "Buscando dados da empresa…",
        invalid: "CNPJ deve ter 14 dígitos.",
        lookupFailed: "Não foi possível buscar o CNPJ, preencha manualmente.",
      },
      tradeName: {
        label: "Nome fantasia",
        required: "Informe o nome fantasia.",
      },
      legalName: { label: "Razão social", required: "Informe a razão social." },
      address: {
        legend: "Endereço",
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
        uf: { label: "UF", invalid: "UF com 2 letras." },
      },
    },
    orgError: "Não foi possível criar sua organização. Tente novamente.",
    profileError: "Não foi possível salvar o perfil. Tente novamente.",
    timeout:
      "Está demorando mais que o esperado para preparar sua conta. Tente novamente em instantes.",
    preparingAccount: "Preparando sua conta…",
  },
  step3: {
    title: "Fontes",
    description: "Conecte as fontes que alimentam seus processos.",
  },
} as const;
