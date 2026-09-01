"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Form do modal "Editar dados" do Perfil — só o NOME (Clerk headless
// user.update). E-mail/senha/foto/sessões não passam por aqui: e-mail é
// verificado (fluxo à parte), senha e sessões são cards inline na página.
export function usePerfilEditForm({ onDone }: { onDone: () => void }) {
  const { user } = useUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Repopula ao abrir/mudar de usuário — evita salvar em cima de campos vazios.
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  const salvar = async () => {
    if (!user) return;
    setSalvando(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success("Dados atualizados.");
      onDone();
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    salvar: () => void salvar(),
    salvando,
  };
}
