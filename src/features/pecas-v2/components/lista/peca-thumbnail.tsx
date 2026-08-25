// Thumbnail estilizado de uma folha A4 com "linhas" douradas — decorativo
// (não representa o conteúdo real). Usado nos cards de "Começar uma nova
// peça" e "Peças recentes" pra dar peso visual ao card. Todas as barras
// têm mesma cor gold-light pra não competir com o texto.

interface Props {
  className?: string;
}

export function PecaThumbnail({ className = "" }: Props) {
  return (
    <div
      className={`border-border/50 bg-card flex aspect-[3/4] w-full items-start justify-center rounded-md border p-4 ${className}`}
    >
      <div className="flex w-full flex-col gap-1.5">
        <div className="h-1 w-1/2 rounded-full bg-[var(--gold-light,rgba(212,175,55,0.25))]" />
        <div className="mt-1 h-1 w-full rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
        <div className="h-1 w-11/12 rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
        <div className="h-1 w-10/12 rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
        <div className="mt-2 h-1 w-full rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
        <div className="h-1 w-11/12 rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
        <div className="h-1 w-9/12 rounded-full bg-[var(--gold-light,rgba(212,175,55,0.18))]" />
      </div>
    </div>
  );
}
