"use client";
import { TeorContent } from "@/components/teor-content";
import { Sheet, SheetContent } from "@/components/ui/sheet";
export function TeorDrawer({
  open,
  onClose,
  titulo,
  tipo,
  meta,
  conteudo,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  tipo: string;
  meta: string;
  conteudo: string;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent title={titulo} description={meta} eyebrow={tipo}>
        <TeorContent content={conteudo} emptyMessage="Sem teor disponível." />
      </SheetContent>
    </Sheet>
  );
}
