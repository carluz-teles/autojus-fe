"use client";

import { useState } from "react";

import { PageHeader, UnderlineTabs } from "@/components/mock-ui/layout";
import { CapturasTab } from "@/features/captures/components/capturas-tab";

import { CertificadoTab } from "./certificado-tab";
import {
  CobrancaTab,
  NotificacoesTab,
  OrganizacaoTab,
  PerfilTab,
} from "./tabs";
import { TermosTab } from "./termos-tab";
import { TribunaisTab } from "./tribunais-tab";

type Aba =
  | "organizacao"
  | "tribunais"
  | "capturas"
  | "termos"
  | "certificado"
  | "cobranca"
  | "notificacoes"
  | "perfil";

export function ConfiguracoesView({ inicial }: { inicial?: string }) {
  const [aba, setAba] = useState<Aba>((inicial as Aba) ?? "organizacao");

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Configurações"
        descricao="Organização, tribunais, certificado, cobrança e sua conta."
      />

      <div className="mt-6">
        <UnderlineTabs
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: "organizacao", label: "Organização" },
            { valor: "tribunais", label: "Tribunais" },
            { valor: "capturas", label: "Ingestão" },
            { valor: "termos", label: "Termos" },
            { valor: "certificado", label: "Certificado" },
            { valor: "cobranca", label: "Cobrança" },
            { valor: "notificacoes", label: "Notificações" },
            { valor: "perfil", label: "Perfil" },
          ]}
        />
      </div>

      {aba === "organizacao" && <OrganizacaoTab />}
      {aba === "tribunais" && <TribunaisTab />}
      {aba === "capturas" && <CapturasTab />}
      {aba === "termos" && <TermosTab />}
      {aba === "certificado" && <CertificadoTab />}
      {aba === "cobranca" && <CobrancaTab />}
      {aba === "notificacoes" && <NotificacoesTab />}
      {aba === "perfil" && <PerfilTab />}
    </div>
  );
}
