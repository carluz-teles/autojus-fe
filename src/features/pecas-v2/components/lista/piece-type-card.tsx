// Card do bloco "Começar uma nova peça" — 3 tipos (Defesa, Contestação,
// Petição). Clique abre o modal Nova peça com o tipo pré-selecionado.

import { PecaThumbnail } from "./peca-thumbnail";

interface Props {
  titulo: string;
  subtitulo: string;
  onClick: () => void;
}

export function PieceTypeCard({ titulo, subtitulo, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-card hover:border-primary/40 hover:bg-muted/30 group flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors"
    >
      <div className="flex justify-center">
        <div className="w-28">
          <PecaThumbnail />
        </div>
      </div>
      <div>
        <div className="text-foreground text-[13.5px] font-medium">
          {titulo}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[11.5px]">
          {subtitulo}
        </div>
      </div>
    </button>
  );
}
