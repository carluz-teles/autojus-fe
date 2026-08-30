"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// Aceite de convite (port de Atjus - Convite.dc.html, persona convidado). Tela
// full-screen estilo Clerk: criar conta / entrar → "Bem-vindo ao escritório".
// MOCK: o aceite real (Clerk invitation ticket) fica pra fase BE — aqui só a UX.
export function useConviteAccept(_token: string) {
  const router = useRouter();
  const [tab, setTab] = useState<"criar" | "entrar">("criar");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [joined, setJoined] = useState(false);

  // Contexto do convite — mock (viria do BE resolvendo o token).
  const escritorio = "Prolheti & Marcondes Advogados";
  const papel = "Advogado";
  const email = "luan.gomes@prolhetimarcondes.adv.br";

  const criar = tab === "criar";
  const podeEntrar = !!(senha && (!criar || nome.trim()));

  const entrar = useCallback(() => {
    if (!podeEntrar) return;
    setJoined(true);
  }, [podeEntrar]);

  return {
    joined,
    form: !joined,
    ehCriar: criar,
    escritorio,
    papel,
    papelCor: "var(--fg2)",
    email,
    nome,
    setNome,
    senha,
    setSenha,
    titulo: criar ? "Criar sua conta" : "Bem-vindo de volta",
    sub: `para entrar em ${escritorio}`,
    cta: "Continuar",
    podeEntrar,
    entrar,
    google: () => setJoined(true),
    microsoft: () => setJoined(true),
    footerTxt: criar ? "Já tem uma conta?" : "Ainda não tem conta?",
    footerLink: criar ? "Entrar" : "Criar conta",
    footerToggle: () => setTab(criar ? "entrar" : "criar"),
    irParaApp: () => router.push("/prazos"),
  };
}
