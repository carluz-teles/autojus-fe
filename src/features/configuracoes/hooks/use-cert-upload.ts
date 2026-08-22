"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  deleteCertificado,
  listCertificados,
  previewCertificado,
  signComCertificado,
  uploadCertificado,
} from "../services/certificado.service";
import type {
  CertificadoPreviewResult,
  CertificadoSignResult,
  CertificateView,
} from "../types/certificado";

// Aceitos pelo design: e-CPF A1 em .pfx / .p12.
export const CERT_ACCEPT = ".pfx,.p12";
const CERT_MIME = new Set([
  "application/x-pkcs12",
  "application/pkcs12",
  "application/octet-stream", // alguns navegadores não reconhecem .pfx/.p12
]);

/** Valida pela extensão (mime é frouxo para pfx/p12 em vários navegadores). */
export function isCertFile(file: File): boolean {
  return /\.(pfx|p12)$/i.test(file.name) || CERT_MIME.has(file.type);
}

const QUERY_KEY = ["certificates"] as const;

/** Lista os certificados do tenant. */
export function useCertificados() {
  const fetcher = useApi();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listCertificados(fetcher),
    select: (res) => res.data,
  });
}

export interface UploadCertificadoArgs {
  file: File;
  /** Enviada APENAS para o BE abrir o PKCS#12 — descartada após validação.
   *  Nunca persistida. Não logar. */
  password: string;
}

/**
 * Faz upload de um certificado A1 via multipart POST (arquivo + senha).
 * A senha é necessária para o BE extrair os metadados do PKCS#12; após isso
 * ela é descartada pelo servidor. "A assinatura é feita localmente; a senha
 * não é armazenada." Em sucesso invalida a lista para reidratar.
 */
export function useUploadCertificado() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<CertificateView, Error, UploadCertificadoArgs>({
    mutationFn: ({ file, password }) =>
      uploadCertificado(fetcher, file, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export interface PreviewCertificadoArgs {
  file: File;
  /** Usada APENAS para o BE abrir o PKCS#12 e ler os metadados. Descartada pelo
   *  servidor após o parse. Nunca persistida. Não logar. */
  password: string;
}

/**
 * Pré-valida o certificado (etapa "Validação" do wizard). Mutation porque depende
 * do arquivo + senha em mãos e não deve cachear (a senha nunca vira chave de
 * cache). Não invalida nada — é read-only no servidor.
 */
export function usePreviewCertificado() {
  const fetcher = useApi();
  return useMutation<CertificadoPreviewResult, Error, PreviewCertificadoArgs>({
    mutationFn: ({ file, password }) =>
      previewCertificado(fetcher, file, password),
  });
}

export interface SignCertificadoArgs {
  id: string;
  /** Senha de sessão — usada só para o BE decifrar o .pfx e assinar. Não logar. */
  password: string;
  /** SHA-256 (base64) do documento a assinar. */
  digestSha256: string;
}

/**
 * Assina um digest com o certificado (mecanismo criptográfico real, server-side).
 * O empacotamento final (PAdES/PDF) é de outra frente; aqui basta assinar o
 * digest. Não cacheia nem invalida — a assinatura é um efeito, não estado de tela.
 */
export function useSignComCertificado() {
  const fetcher = useApi();
  return useMutation<CertificadoSignResult, Error, SignCertificadoArgs>({
    mutationFn: ({ id, password, digestSha256 }) =>
      signComCertificado(fetcher, id, password, digestSha256),
  });
}

/** Remove / revoga o certificado por id. Em sucesso invalida a lista. */
export function useDeleteCertificado() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCertificado(fetcher, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
