"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { ApiError } from "@/lib/api/errors";

import { usePrazo } from "../hooks/use-prazo";
import { PrazoDetalhe } from "./prazo-detalhe";

// Página de deep-link do detalhe do prazo (/prazos/[id]). Busca o prazo por id
// (GET /v1/prazos/:id — o "por quê" do cálculo), então abre para QUALQUER prazo.
// Trata carregamento/erro/404 aqui e delega o conteúdo (LEXIA · DetailLayout) para
// PrazoDetalhe. Espelha IntimacaoDetailPage. Componente = binding.
export function PrazoDetalhePage({ id }: { id: string }) {
  const { prazo, isPending, isError, error } = usePrazo(id);

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  if (isPending) return <PrazoDetalhePageSkeleton />;

  if (isError || !prazo) {
    return (
      <>
        <BackLink />
        <PageHeader
          title={notFound ? "Prazo não encontrado" : "Erro ao carregar"}
          description={
            notFound
              ? "Ele pode ter sido removido ou o link está incorreto."
              : error instanceof ApiError
                ? error.message
                : "Tente novamente em instantes."
          }
        />
        <div className="reveal mt-8">
          <Link href="/prazos" className="text-gold text-sm hover:underline">
            Voltar para os prazos
          </Link>
        </div>
      </>
    );
  }

  return <PrazoDetalhe prazo={prazo} />;
}

function BackLink() {
  return (
    <div className="reveal mb-6">
      <Link
        href="/prazos"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Prazos
      </Link>
    </div>
  );
}

function PrazoDetalhePageSkeleton() {
  return (
    <div className="reveal flex flex-col gap-4">
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-muted h-8 w-56 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-9 w-80 animate-pulse rounded-lg" />
      <div className="bg-muted h-56 w-full animate-pulse rounded-xl" />
    </div>
  );
}
