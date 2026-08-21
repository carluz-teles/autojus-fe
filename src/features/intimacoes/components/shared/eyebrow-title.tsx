// EyebrowTitle — título de seção uppercase tiny, tracking largo, muted. Extraído de
// intimacao-detail.tsx (Regra nº1): usado ali E no painel lateral do master-detail
// (intimacoes-view.tsx), mesma linguagem visual das duas telas.

export function EyebrowTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}
