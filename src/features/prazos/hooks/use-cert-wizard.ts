"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Certificado } from "./use-config";

// Wizard "Adicionar certificado" (port de Atjus - Certificado.dc.html). Máquina
// de estados: tipo → a1/a3 → validando → valido/erro. Mock: upload/detecção/
// validação simulados com setTimeout (nada sai do dispositivo). Ligação real
// (upload + validação de cadeia) fica pra fase BE.
export type CertStep = "tipo" | "a1" | "a3" | "validando" | "valido" | "erro";
type CertTipo = "A1" | "A3";

interface FileMock {
  nome: string;
  tam: string;
}

const CERTS_INICIAIS: Certificado[] = [
  {
    label: "Ricardo Menezes",
    tipo: "A1",
    validade: "válido até 14/03/2027",
    status: "Ativo",
    statusFundo: "color-mix(in oklch, var(--green) 15%, transparent)",
    statusCor: "var(--green)",
  },
  {
    label: "Menezes Advocacia",
    tipo: "A1",
    validade: "válido até 02/11/2026",
    status: "Ativo",
    statusFundo: "color-mix(in oklch, var(--green) 15%, transparent)",
    statusCor: "var(--green)",
  },
  {
    label: "Ana Furtado",
    tipo: "A3",
    validade: "expira em 22/09/2026",
    status: "Expira em breve",
    statusFundo: "color-mix(in oklch, var(--gold) 16%, transparent)",
    statusCor: "var(--gold)",
  },
];

const DET_LINHAS = [
  { rot: "Titular", val: "Renata Marcondes", mono: false },
  { rot: "Documento", val: "CPF •••.456.789-00", mono: true },
  { rot: "Emissor", val: "AC Certisign RFB G5", mono: false },
  { rot: "Validade", val: "até 14/12/2026", mono: true },
];

const TITULOS: Record<CertStep, string> = {
  tipo: "Adicionar certificado",
  a1: "Certificado A1",
  a3: "Certificado A3",
  validando: "Validando",
  valido: "Confirmar certificado",
  erro: "Não foi possível validar",
};
const SUBS: Record<CertStep, string> = {
  tipo: "Escolha como você guarda o certificado.",
  a1: "Envie o arquivo e informe a senha.",
  a3: "Detecte o token ou cartão conectado.",
  validando: "Um instante…",
  valido: "Confira os dados antes de adicionar.",
  erro: "Revise e tente de novo.",
};

export function useCertWizard() {
  const [lista, setLista] = useState<Certificado[]>(CERTS_INICIAIS);
  const [aberto, setAberto] = useState(false);
  const [step, setStep] = useState<CertStep>("tipo");
  const [tipo, setTipo] = useState<CertTipo>("A1");
  const [file, setFile] = useState<FileMock | null>(null);
  const [senha, setSenha] = useState("");
  const [pin, setPin] = useState("");
  const [a3found, setA3found] = useState(false);

  const tVal = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tA3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (tVal.current) clearTimeout(tVal.current);
      if (tA3.current) clearTimeout(tA3.current);
    },
    [],
  );

  const abrir = useCallback(() => {
    setStep("tipo");
    setTipo("A1");
    setFile(null);
    setSenha("");
    setPin("");
    setA3found(false);
    setAberto(true);
  }, []);
  const fechar = useCallback(() => setAberto(false), []);

  const validar = useCallback((ok: boolean) => {
    setStep("validando");
    if (tVal.current) clearTimeout(tVal.current);
    tVal.current = setTimeout(() => setStep(ok ? "valido" : "erro"), 1600);
  }, []);

  const pickA1 = useCallback(() => {
    setTipo("A1");
    setFile(null);
    setSenha("");
    setStep("a1");
  }, []);
  const pickA3 = useCallback(() => {
    setTipo("A3");
    setA3found(false);
    setPin("");
    setStep("a3");
    if (tA3.current) clearTimeout(tA3.current);
    tA3.current = setTimeout(() => setA3found(true), 1700);
  }, []);

  const adicionar = useCallback(() => {
    setLista((l) => [
      {
        label: "e-CPF · Renata Marcondes",
        tipo,
        validade: "válido até 12/2026",
        status: "Ativo",
        statusFundo: "color-mix(in oklch, var(--green) 15%, transparent)",
        statusCor: "var(--green)",
      },
      ...l,
    ]);
    setAberto(false);
  }, [tipo]);

  const podeA1 = !!(file && senha);

  // Rodapé dinâmico (voltar + botão primário), fiel ao renderVals do mockup.
  const footer = useMemo(() => {
    if (step === "tipo" || step === "validando") return null;
    if (step === "a1")
      return {
        voltarLabel: "Voltar",
        onVoltar: () => {
          setFile(null);
          setSenha("");
          setStep("tipo");
        },
        primaryLabel: "Validar certificado",
        primaryOn: podeA1,
        onPrimary: () => {
          if (podeA1) validar(senha.length >= 6);
        },
      };
    if (step === "a3")
      return {
        voltarLabel: "Voltar",
        onVoltar: () => {
          setPin("");
          setA3found(false);
          setStep("tipo");
        },
        primaryLabel: "Usar este certificado",
        primaryOn: a3found,
        onPrimary: () => {
          if (a3found) validar(true);
        },
      };
    if (step === "valido")
      return {
        voltarLabel: "Cancelar",
        onVoltar: fechar,
        primaryLabel: "Adicionar certificado",
        primaryOn: true,
        onPrimary: adicionar,
      };
    // erro
    return {
      voltarLabel: "Fechar",
      onVoltar: fechar,
      primaryLabel: "Tentar novamente",
      primaryOn: true,
      onPrimary: () => {
        setSenha("");
        setPin("");
        setStep(tipo === "A3" ? "a3" : "a1");
        if (tipo === "A3") {
          setA3found(false);
          if (tA3.current) clearTimeout(tA3.current);
          tA3.current = setTimeout(() => setA3found(true), 1700);
        }
      },
    };
  }, [step, podeA1, senha, a3found, tipo, validar, fechar, adicionar]);

  return {
    lista,
    aberto,
    abrir,
    fechar,
    titulo: TITULOS[step],
    sub: SUBS[step],
    step,
    ehTipo: step === "tipo",
    ehA1: step === "a1",
    ehA3: step === "a3",
    ehValidando: step === "validando",
    ehValido: step === "valido",
    ehErro: step === "erro",
    pickA1,
    pickA3,
    // a1
    file,
    escolher: () =>
      setFile({ nome: "e-CPF_renata_marcondes.pfx", tam: "3,2 KB" }),
    trocar: () => {
      setFile(null);
      setSenha("");
    },
    senha,
    setSenha,
    // a3
    a3found,
    pin,
    setPin,
    // valido — dados extraídos (Titular / Documento / Tipo / Emissor / Validade)
    detValidade: "expira em 472 dias",
    detLinhas: [
      DET_LINHAS[0],
      DET_LINHAS[1],
      { rot: "Tipo", val: `e-CPF ${tipo}`, mono: false },
      DET_LINHAS[2],
      DET_LINHAS[3],
    ],
    // erro
    erroTitulo: "Senha incorreta",
    erroMsg:
      "Não conseguimos abrir o certificado com essa senha. Confira e tente novamente.",
    footer,
  };
}
