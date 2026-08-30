"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

// Modal "Convidar membro" (port de Atjus - Convite.dc.html, persona admin):
// chips de e-mail → papel (Sócio/Advogado/Estagiário) → "pode protocolar" →
// mensagem → enviar → sucesso com link compartilhável. Mock: o envio real de
// invitations (Clerk) fica pra fase BE.
export type Papel = "Sócio" | "Advogado" | "Estagiário";

const PAPEL_DEFS: { k: Papel; label: string; desc: string; cor: string }[] = [
  {
    k: "Sócio",
    label: "Sócio",
    desc: "Acesso total · protocola e gerencia o escritório",
    cor: "var(--primary)",
  },
  {
    k: "Advogado",
    label: "Advogado",
    desc: "Trabalha prazos e peças · protocola se permitido",
    cor: "var(--fg2)",
  },
  {
    k: "Estagiário",
    label: "Estagiário",
    desc: "Apoia na redação · não protocola",
    cor: "var(--gold)",
  },
];

export interface InvitePendente {
  email: string;
  papel: Papel;
  reenviar: () => void;
}

export function useInvite() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [papel, setPapel] = useState<Papel>("Advogado");
  const [proto, setProto] = useState(false);
  const [msg, setMsg] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pendentes, setPendentes] = useState<InvitePendente[]>([]);
  const tCopy = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abrir = useCallback(() => {
    setAberto(true);
    setEnviado(false);
  }, []);
  const fechar = useCallback(() => setAberto(false), []);

  const addEmail = useCallback(() => {
    setEmail((v) => {
      const t = v.trim();
      if (t && t.includes("@")) setChips((c) => c.concat(t));
      return t.includes("@") ? "" : v;
    });
  }, []);
  const removeChip = useCallback(
    (i: number) => setChips((c) => c.filter((_, j) => j !== i)),
    [],
  );

  const podeEnviar = chips.length > 0 || email.includes("@");

  const enviar = useCallback(() => {
    if (!podeEnviar) return;
    const extra = email.trim();
    const todos =
      extra && extra.includes("@") ? chips.concat(extra) : chips.slice();
    setChips(todos);
    setEmail("");
    setPendentes(todos.map((e) => ({ email: e, papel, reenviar: () => {} })));
    setEnviado(true);
  }, [podeEnviar, email, chips, papel]);

  const copiar = useCallback(() => {
    setCopiado(true);
    if (tCopy.current) clearTimeout(tCopy.current);
    tCopy.current = setTimeout(() => setCopiado(false), 1600);
  }, []);

  const papeis = useMemo(
    () =>
      PAPEL_DEFS.map((p) => {
        const on = papel === p.k;
        return {
          k: p.k,
          label: p.label,
          desc: p.desc,
          pick: () => setPapel(p.k),
          borda: on ? "var(--primary)" : "var(--line)",
          bg: on ? "var(--selected)" : "var(--bg)",
          ring: on ? "var(--primary)" : "var(--line)",
          dot: on ? "var(--primary)" : "transparent",
        };
      }),
    [papel],
  );

  const totalEnviados = chips.length + (email.includes("@") ? 1 : 0);

  return {
    aberto,
    abrir,
    fechar,
    sub: enviado
      ? "Convite enviado."
      : "Eles recebem um link para entrar no escritório.",
    compondo: !enviado,
    enviado,
    email,
    setEmail,
    addEmail,
    chips: chips.map((e, i) => ({ email: e, rm: () => removeChip(i) })),
    temChips: chips.length > 0,
    papeis,
    proto,
    protoTrilho: proto ? "var(--primary)" : "var(--line)",
    protoKnob: proto ? "translateX(16px)" : "translateX(0)",
    toggleProto: () => setProto((p) => !p),
    msg,
    setMsg,
    podeEnviar,
    enviar,
    enviadoTitulo: totalEnviados > 1 ? "Convites enviados" : "Convite enviado",
    link: "app.atjus.com.br/convite/ATJ-4K9P-22",
    copiado,
    copiarLabel: copiado ? "Copiado ✓" : "Copiar",
    copiar,
    verConvidado: () => {
      setAberto(false);
      router.push("/convite/ATJ-4K9P-22");
    },
    pendentes,
  };
}
