"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useDocumentosDoProcesso } from "@/features/documentos/hooks/use-documentos-do-processo";

import { draftKeys } from "../../hooks/use-draft";
export function SourceActions({
  courtRecordId,
  draftId,
}: {
  courtRecordId: string;
  draftId?: string;
}) {
  const docs = useDocumentosDoProcesso(courtRecordId);
  const qc = useQueryClient();
  const uploadInput = useRef<HTMLInputElement>(null);
  if (!courtRecordId) return null;
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={docs.upload.isUploading}
        onClick={() => uploadInput.current?.click()}
      >
        <Upload data-icon="inline-start" aria-hidden />
        {docs.upload.isUploading ? "Enviando…" : "Anexar PDF"}
      </Button>
      <input
        ref={uploadInput}
        aria-label="Anexar PDF ao processo"
        disabled={docs.upload.isUploading}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            docs.upload.enviar(file, {
              onSuccess: () => {
                if (draftId)
                  void qc.invalidateQueries({
                    queryKey: draftKeys.detail(draftId),
                  });
              },
            });
          e.target.value = "";
        }}
      />
      {docs.upload.uploadError && (
        <p role="alert" className="text-destructive text-xs">
          Não foi possível anexar o documento.
        </p>
      )}
      {docs.hasNextPage && (
        <Button
          variant="link"
          size="sm"
          disabled={docs.isFetchingNextPage}
          onClick={() => void docs.fetchNextPage()}
        >
          Mostrar mais autos
        </Button>
      )}
    </div>
  );
}
