import type { Metadata } from "next";

import { ShellContent } from "@/components/shell/shell-content";
import { PreviewSidebar } from "@/components/shell/sidebar";
import { IntimacaoWorkspaceMock } from "@/features/mockups/intimacao-workspace/components/intimacao-workspace";

export const metadata: Metadata = {
  title: "Mockup · Intimação como unidade de trabalho",
};

// Mockup navegável do redesign da jornada principal (intimação → providência →
// peça numa tela só), montado no esqueleto real da plataforma (PreviewSidebar +
// ShellContent, mesmo padrão do journey-prototype). Sem I/O: dados estáticos.
export default function Page() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <PreviewSidebar triagemCount={6} />
      <ShellContent>
        <IntimacaoWorkspaceMock />
      </ShellContent>
    </div>
  );
}
