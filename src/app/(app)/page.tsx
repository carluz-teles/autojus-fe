import { PrazosView } from "@/features/prazos/components/prazos-view";

export const metadata = { title: "Prazos · jus·assessoria" };

// Superfície de triagem (Inbox) + quadro (Pipeline). Full-bleed: o ShellContent
// detecta /prazos e entrega a área sem header/padding globais, então a tela usa
// sua própria top-bar de 44px (casca "Linear" do rebranding).
export default function PrazosPage() {
  return <PrazosView />;
}
