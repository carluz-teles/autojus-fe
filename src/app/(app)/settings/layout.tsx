import { PageHeader } from "@/components/shell/page-header";
import { SettingsNav } from "@/components/shell/settings-nav";

// Configurações: um só lugar para Organização, Integrações, Cobrança e Perfil.
// O header + as abas ficam aqui; cada seção é uma sub-rota que renderiza só o seu
// conteúdo (sem PageHeader próprio).
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Organização, integrações, cobrança e sua conta."
      />
      <div className="reveal mt-8">
        <SettingsNav />
      </div>
      {children}
    </>
  );
}
