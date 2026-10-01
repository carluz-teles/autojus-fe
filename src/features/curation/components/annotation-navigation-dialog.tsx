"use client";
import { Dialog } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";

import type { useAnnotationForm } from "../hooks/use-annotations";
export function AnnotationNavigationDialog({
  navigation,
}: {
  navigation: ReturnType<typeof useAnnotationForm>["navigation"];
}) {
  return (
    <Dialog.Root
      open={!!navigation.destination}
      onOpenChange={navigation.changeOpen}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6 shadow-lg">
          <Dialog.Title className="font-display text-xl">
            Há trabalho ainda não confirmado
          </Dialog.Title>
          <Dialog.Description>
            Conclua ou recupere o envio antes de sair. Edições não salvas são
            perdidas ao fechar esta tela.
          </Dialog.Description>
          <div className="flex gap-3">
            <Button type="button" onClick={navigation.stay}>
              Continuar revisando
            </Button>
            <Button type="button" variant="outline" onClick={navigation.leave}>
              Sair sem confirmar as edições
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
