import type { ApiFetcher, PresignedStorage } from "@/lib/api/use-api";

const BASE = "/v1/document-templates";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type TemplateVersionStatus =
  "UPLOADING" | "VALIDATING" | "READY" | "FAILED";

export interface DocumentTemplateVersion {
  id: string;
  template_id: string;
  version_no: number;
  status: TemplateVersionStatus;
  diagnostic?: string | null;
  source_sha256?: string | null;
  sample_pdf_sha256?: string | null;
  sample_pdf_url?: string;
  engine_version?: string | null;
  metadata?: unknown;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  archived: boolean;
  created_at: string;
  latest_version?: Pick<
    DocumentTemplateVersion,
    "id" | "version_no" | "status" | "diagnostic"
  > | null;
}

export interface DocumentTemplateDefault {
  template_id: string;
  version_id: string;
}

export interface TemplatePage {
  data: DocumentTemplate[];
  page: { next_cursor: string | null; limit: number };
}

export interface TemplateDetail {
  template: DocumentTemplate;
  versions: DocumentTemplateVersion[];
}

export async function listDocumentTemplates(
  fetcher: ApiFetcher,
  cursor?: string,
  signal?: AbortSignal,
): Promise<TemplatePage> {
  return fetcher<TemplatePage>(BASE, {
    query: { limit: 20, cursor },
    signal,
  });
}

export async function getDocumentTemplateDefault(
  fetcher: ApiFetcher,
  signal?: AbortSignal,
): Promise<DocumentTemplateDefault | null> {
  const response = await fetcher<{ data: DocumentTemplateDefault | null }>(
    "/v1/document-template-default",
    { signal },
  );
  return response.data;
}

export async function getDocumentTemplate(
  fetcher: ApiFetcher,
  templateId: string,
  signal?: AbortSignal,
): Promise<TemplateDetail> {
  const response = await fetcher<{ data: TemplateDetail }>(
    `${BASE}/${encodeURIComponent(templateId)}`,
    { signal },
  );
  return response.data;
}

export async function createDocumentTemplate(
  fetcher: ApiFetcher,
  name: string,
  signal?: AbortSignal,
): Promise<DocumentTemplate> {
  const response = await fetcher<{ data: DocumentTemplate }>(BASE, {
    method: "POST",
    body: { name },
    signal,
  });
  return response.data;
}

export async function startDocumentTemplateUpload(
  fetcher: ApiFetcher,
  templateId: string,
  signal?: AbortSignal,
): Promise<{
  version: DocumentTemplateVersion;
  url: string;
  expires_in: number;
}> {
  const response = await fetcher<{
    data: { version: DocumentTemplateVersion; url: string; expires_in: number };
  }>(`${BASE}/${encodeURIComponent(templateId)}/versions/uploads`, {
    method: "POST",
    signal,
  });
  return response.data;
}

export async function putDocumentTemplateBytes(
  storage: PresignedStorage,
  url: string,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  await storage.put(url, file, signal);
}

export async function confirmDocumentTemplateVersion(
  fetcher: ApiFetcher,
  templateId: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<DocumentTemplateVersion> {
  const response = await fetcher<{ data: DocumentTemplateVersion }>(
    `${BASE}/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}/confirm`,
    { method: "POST", signal },
  );
  return response.data;
}

export async function setDocumentTemplateDefault(
  fetcher: ApiFetcher,
  versionId: string,
  signal?: AbortSignal,
): Promise<void> {
  await fetcher("/v1/document-template-default", {
    method: "PUT",
    body: { version_id: versionId },
    signal,
  });
}

export async function downloadDocumentTemplatePreview(
  storage: PresignedStorage,
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return storage.getBlob(url, signal);
}
