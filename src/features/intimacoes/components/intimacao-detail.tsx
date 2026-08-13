"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { IntimacaoView } from "@/features/intimacoes/types";

import {
  AbrirNoTribunalButton,
  DEGREE_LABEL,
  IntimacaoBadges,
  IntimacaoDetailBody,
} from "./intimacao-detail-body";

// Detalhe da intimação em drawer sobre a lista. Reaproveita o corpo e o painel
// F2 de intimacao-detail-body (mesma fonte da página de deep-link /intimacoes/[id]);
// aqui só monta o chrome do Sheet (eyebrow/título/footer).
export function IntimacaoDetail({
  intimacao,
  open,
  onOpenChange,
  onOpenChangeComplete,
}: {
  intimacao: IntimacaoView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      {intimacao ? (
        <SheetContent
          eyebrow={<IntimacaoBadges intimacao={intimacao} />}
          title={intimacao.cnj_number}
          description={`${intimacao.court} · ${
            DEGREE_LABEL[intimacao.degree] ?? intimacao.degree
          }`}
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <AbrirNoTribunalButton intimacao={intimacao} />
            </>
          }
        >
          <IntimacaoDetailBody intimacao={intimacao} />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
