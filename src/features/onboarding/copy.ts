// Fonte ÚNICA da linguagem do onboarding. Nenhum componente/hook da feature
// declara string solta: mudar um texto = mudar aqui (tom consistente, revisão
// num lugar só).
//
// Desenho do fluxo (decisão de produto): o sign-up do Clerk já coleta o nome, e a
// foto vive no /profile — então o onboarding vai direto ao que cria o tenant: a
// empresa. OAB/fontes e convite de time saíram do wizard (2026-08-19, decisão do
// produto) e ficam pra depois em Integrações/Configurações — ainda sem tela
// cabeada (débito conhecido, não esquecido).

export const onboardingCopy = {
  page: {
    title: "Vamos configurar sua conta",
    subtitle: "Só um passo rápido pra criar sua conta.",
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
        invalid: "CNPJ deve ter 14 dígitos.",
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
