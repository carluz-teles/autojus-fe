"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  useCertificados,
  useDeleteCertificado,
  useUploadCertificado,
} from "@/features/configuracoes/hooks/use-cert-upload";
import type { CertificateView } from "@/features/configuracoes/types/certificado";
import { ApiError } from "@/lib/api/errors";

// Só a SENHA é campo de formulário (RHF); o arquivo .pfx/.p12 é plumbing de UI
// (input file controlado à parte). Senha obrigatória — o BE valida o resto.
const certSchema = z.object({
  senha: z.string().min(1, "Informe a senha do certificado."),
});

export type CertForm = z.infer<typeof certSchema>;

// Wizard "Adicionar certificado" — direto ao ponto (A1, BE real): escolher o
// arquivo .pfx/.p12 + senha → POST /v1/certificates. Sem etapa de escolha de
// tipo, sem preview: o próprio upload valida no BE e, se der problema, mostra a
// mensagem de erro inline. (A3/token entra quando houver suporte real.)

// Metadados de exibição de um certificado já cadastrado (linha da lista).
export interface CertLinha {
  id: string;
  label: string;
  tipo: string;
  validade: string;
  status: string;
  statusFundo: string;
  statusCor: string;
  remover: () => void;
  removendo: boolean;
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function diasAte(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function fmtTam(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function statusDeCert(c: CertificateView): {
  status: string;
  fundo: string;
  cor: string;
  validade: string;
} {
  if (c.revoked_at) {
    return {
      status: "Revogado",
      fundo: "color-mix(in oklch, var(--red) 14%, transparent)",
      cor: "var(--red)",
      validade: `revogado em ${fmtData(c.revoked_at)}`,
    };
  }
  const dias = diasAte(c.not_after);
  if (dias <= 0) {
    return {
      status: "Expirado",
      fundo: "color-mix(in oklch, var(--red) 14%, transparent)",
      cor: "var(--red)",
      validade: `expirou em ${fmtData(c.not_after)}`,
    };
  }
  if (dias <= 30) {
    return {
      status: "Expira em breve",
      fundo: "color-mix(in oklch, var(--gold) 16%, transparent)",
      cor: "var(--gold)",
      validade: `expira em ${dias} dia${dias > 1 ? "s" : ""}`,
    };
  }
  return {
    status: "Ativo",
    fundo: "color-mix(in oklch, var(--green) 15%, transparent)",
    cor: "var(--green)",
    validade: `válido até ${fmtData(c.not_after)}`,
  };
}

export function useCertWizard() {
  const certsQuery = useCertificados();
  const uploadMut = useUploadCertificado();
  const deleteMut = useDeleteCertificado();

  const [aberto, setAberto] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const form = useForm<CertForm>({
    resolver: zodResolver(certSchema),
    defaultValues: { senha: "" },
  });
  const { handleSubmit, reset } = form;

  const abrir = useCallback(() => {
    setFile(null);
    reset({ senha: "" });
    setErro(null);
    setAberto(true);
  }, [reset]);
  const fechar = useCallback(() => {
    setAberto(false);
    reset({ senha: "" });
    setFile(null);
  }, [reset]);

  const selecionarArquivo = useCallback((f: File) => {
    setErro(null);
    setFile(f);
  }, []);
  const trocar = useCallback(() => {
    setFile(null);
    reset({ senha: "" });
    setErro(null);
  }, [reset]);

  const adicionar = handleSubmit(({ senha }) => {
    if (!file) return;
    setErro(null);
    uploadMut.mutate(
      { file, password: senha },
      {
        onSuccess: () => {
          toast.success("Certificado adicionado.");
          setAberto(false);
          reset({ senha: "" });
          setFile(null);
        },
        onError: (e) => {
          setErro(
            e instanceof ApiError
              ? e.message
              : "Não foi possível validar o certificado. Confira o arquivo e a senha.",
          );
        },
      },
    );
  });

  const remover = useCallback(
    (id: string) => {
      setRemovendoId(id);
      deleteMut.mutate(id, {
        onSuccess: () => toast.success("Certificado removido."),
        onError: () => toast.error("Não foi possível remover o certificado."),
        onSettled: () => setRemovendoId(null),
      });
    },
    [deleteMut],
  );

  const lista = useMemo<CertLinha[]>(
    () =>
      (certsQuery.data ?? []).map((c) => {
        const s = statusDeCert(c);
        return {
          id: c.id,
          label: c.owner_user_name || c.subject_cn,
          tipo: c.oab || "A1",
          validade: s.validade,
          status: s.status,
          statusFundo: s.fundo,
          statusCor: s.cor,
          remover: () => remover(c.id),
          removendo: removendoId === c.id,
        };
      }),
    [certsQuery.data, removendoId, remover],
  );

  return {
    // lista
    lista,
    listaPendente: certsQuery.isPending,
    listaErro: certsQuery.isError,
    // modal (upload A1 direto)
    aberto,
    abrir,
    fechar,
    file: file ? { nome: file.name, tam: fmtTam(file.size) } : null,
    selecionarArquivo,
    trocar,
    form,
    erro,
    // Botão liga só com arquivo escolhido e sem upload em voo; a senha é validada
    // por RHF ao submeter (mensagem por campo).
    podeAdicionar: !!file && !uploadMut.isPending,
    adicionar,
    adicionando: uploadMut.isPending,
  };
}
