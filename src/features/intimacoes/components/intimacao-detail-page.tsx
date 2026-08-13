"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { ApiError } from "@/lib/api/errors";

import { useIntimacao } from "../hooks/use-intimacao";
import { IntimacaoDetalhe } from "./intimacao-detalhe";

// Página de deep-link do detalhe da intimação (/intimacoes/[id]). Busca a intimação
// por id (GET /v1/intimacoes/:id), então abre para QUALQUER intimação — mesmo fora
// das páginas já carregadas da lista. Trata carregamento/erro/404 aqui e delega o
// conteúdo (design LEXIA · DetailLayout) para IntimacaoDetalhe. Componente = binding.
export function IntimacaoDetailPage({ id }: { id: string }) {
  const { intimacao, isPending, isError, error } = useIntimacao(id);

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  if (isPending) return <IntimacaoDetailPageSkeleton />;

  if (isError || !intimacao) {
    return (
      <>
        <BackLink />
        <PageHeader
          title={notFound ? "Intimação não encontrada" : "Erro ao carregar"}
          description={
            notFound
              ? "Ela pode ter sido removida ou o link está incorreto."
              : error instanceof ApiError
                ? error.message
                : "Tente novamente em instantes."
          }
        />
        <div className="reveal mt-8">
          <Link
            href="/intimacoes"
            className="text-gold text-sm hover:underline"
          >
            Voltar para as intimações
          </Link>
        </div>
      </>
    );
  }

  return <IntimacaoDetalhe intimacao={intimacao} />;
}

function BackLink() {
  return (
    <div className="reveal mb-6">
      <Link
        href="/intimacoes"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Intimações
      </Link>
    </div>
  );
}

function IntimacaoDetailPageSkeleton() {
  return (
    <div className="reveal flex flex-col gap-4">
      <div className="bg-muted h-4 w-40 animate-pulse rounded" />
      <div className="bg-muted h-8 w-64 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-9 w-72 animate-pulse rounded-lg" />
      <div className="bg-muted h-56 w-full animate-pulse rounded-xl" />
    </div>
  );
}
