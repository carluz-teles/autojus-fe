"use client";
import { useQueryClient } from "@tanstack/react-query";
import { ListPlus, Upload } from "lucide-react";
import { useRef } from "react";

import { IconAction } from "@/components/ui/icon-action";
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
    <div className="flex flex-wrap items-center gap-1">
      <IconAction
        icon={Upload}
        label={
          docs.upload.isUploading
            ? "Enviando documento…"
            : "Anexar PDF ao processo"
        }
        loading={docs.upload.isUploading}
        onClick={() => uploadInput.current?.click()}
      />
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
        <p role="alert" className="text-destructive basis-full text-xs">
          Não foi possível anexar o documento.
        </p>
      )}
      {docs.hasNextPage && (
        <IconAction
          icon={ListPlus}
          label="Carregar mais autos"
          loading={docs.isFetchingNextPage}
          onClick={() => void docs.fetchNextPage()}
        />
      )}
    </div>
  );
}
