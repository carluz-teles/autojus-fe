import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { useApi, usePresignedStorage } from "@/lib/api/use-api";

import {
  type DocumentTemplateDefault,
  type DocumentTemplateVersion,
  downloadDocumentTemplatePreview,
  getDocumentTemplate,
} from "../../services/document-templates.service";

type Target = {
  templateId: string;
  name: string;
  organizationId: string;
  origin: "list" | "wizard";
};

export function choosePreviewVersion(
  versions: DocumentTemplateVersion[],
  currentDefault: DocumentTemplateDefault | null,
  templateId: string,
) {
  const ready = versions.filter((version) => version.status === "READY");
  const pinned =
    currentDefault?.template_id === templateId
      ? ready.find((version) => version.id === currentDefault.version_id)
      : undefined;
  return pinned ?? ready.sort((a, b) => b.version_no - a.version_no)[0];
}

export function useTemplatePreview(
  orgId: string | null | undefined,
  currentDefault: DocumentTemplateDefault | null,
) {
  const fetcher = useApi();
  const storage = usePresignedStorage();
  const [target, setTarget] = useState<Target | null>(null);
  const [expanded, setExpanded] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const active = target?.organizationId === orgId ? target : null;

  const result = useQuery({
    queryKey: [
      "document-template-preview",
      orgId,
      active?.templateId,
      currentDefault?.version_id,
    ],
    enabled: !!active && !!orgId,
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!active) throw new Error("Modelo não selecionado.");
      const detail = await getDocumentTemplate(
        fetcher,
        active.templateId,
        signal,
      );
      const version = choosePreviewVersion(
        detail.versions,
        currentDefault,
        active.templateId,
      );
      if (!version?.sample_pdf_url) return { version, blob: null };
      try {
        const blob = await downloadDocumentTemplatePreview(
          storage,
          version.sample_pdf_url,
          signal,
        );
        return { version, blob };
      } catch (error) {
        if (!(error instanceof ApiError) || ![400, 403].includes(error.status))
          throw error;
        const renewed = await getDocumentTemplate(
          fetcher,
          active.templateId,
          signal,
        );
        const fresh = renewed.versions.find((item) => item.id === version.id);
        if (!fresh?.sample_pdf_url) throw error;
        const blob = await downloadDocumentTemplatePreview(
          storage,
          fresh.sample_pdf_url,
          signal,
        );
        return { version: fresh, blob };
      }
    },
  });

  function open(event: React.MouseEvent<HTMLButtonElement>) {
    const templateId = event.currentTarget.dataset.templateId;
    const name = event.currentTarget.dataset.templateName;
    if (templateId && name && orgId) {
      setExpanded(false);
      setTarget({ templateId, name, organizationId: orgId, origin: "list" });
    }
  }

  function openById(templateId: string, name: string) {
    if (!orgId) return;
    setExpanded(false);
    setTarget({ templateId, name, organizationId: orgId, origin: "wizard" });
  }

  function close() {
    setTarget(null);
    setExpanded(false);
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }

  function onOpenChange(next: boolean) {
    if (!next) close();
  }

  function toggleZoom() {
    setExpanded((current) => !current);
  }

  function openPdf() {
    if (!result.data?.blob) return;
    const url = URL.createObjectURL(result.data.blob);
    objectUrls.current.add(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function retry() {
    void result.refetch();
  }

  useEffect(
    () => () => {
      setTarget(null);
      setExpanded(false);
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [orgId],
  );

  return {
    open,
    openById,
    close,
    onOpenChange,
    toggleZoom,
    openPdf,
    retry,
    isListOpen: active?.origin === "list",
    isWizardOpen: active?.origin === "wizard",
    name: active?.name ?? "",
    expanded,
    result,
  };
}
