"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  deleteCertificado,
  listCertificados,
  uploadCertificado,
} from "../services/certificado.service";
import type { CertificateView } from "../types/certificado";

// Aceitos pelo design: e-CPF A1 em .pfx / .p12.
export const CERT_ACCEPT = ".pfx,.p12";

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

/** Remove / revoga o certificado por id. Em sucesso invalida a lista. */
export function useDeleteCertificado() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCertificado(fetcher, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
