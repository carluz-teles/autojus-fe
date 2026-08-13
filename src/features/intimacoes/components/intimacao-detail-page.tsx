"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { ApiError } from "@/lib/api/errors";

import { useIntimacao } from "../hooks/use-intimacao";
import {
  AbrirNoTribunalButton,
  DEGREE_LABEL,
  IntimacaoBadges,
  IntimacaoDetailBody,
} from "./intimacao-detail-body";

// Página de deep-link do detalhe da intimação (/intimacoes/[id]). Diferente do
// drawer sobre a lista, busca a intimação por id (GET /v1/intimacoes/:id), então
// abre para QUALQUER intimação — mesmo fora das páginas já carregadas. Reaproveita
// o corpo + painel F2 (ConfirmarPrazo) de intimacao-detail-body. Componente =
// binding: os estados vêm do hook useIntimacao.
export function IntimacaoDetailPage({ id }: { id: string }) {
  const { intimacao, isPending, isError, error } = useIntimacao(id);

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  return (
    <>
      <div className="reveal">
        <Link
          href="/intimacoes"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> Intimações
        </Link>
      </div>

      {isPending ? (
        <IntimacaoDetailPageSkeleton />
      ) : isError || !intimacao ? (
        <>
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
      ) : (
        <>
          <PageHeader
            title={intimacao.cnj_number}
            description={`${intimacao.court} · ${
              DEGREE_LABEL[intimacao.degree] ?? intimacao.degree
            }`}
            action={<AbrirNoTribunalButton intimacao={intimacao} />}
          />

          <div className="reveal mt-4 flex flex-wrap items-center gap-1.5">
            <IntimacaoBadges intimacao={intimacao} />
          </div>

          <div className="reveal mt-6 max-w-2xl">
            <IntimacaoDetailBody intimacao={intimacao} />
          </div>
        </>
      )}
    </>
  );
}

function IntimacaoDetailPageSkeleton() {
  return (
    <div className="reveal mt-6 flex max-w-2xl flex-col gap-4">
      <div className="bg-muted h-8 w-64 animate-pulse rounded" />
      <div className="bg-muted h-4 w-40 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-40 w-full animate-pulse rounded-xl" />
      <div className="bg-muted h-56 w-full animate-pulse rounded-xl" />
    </div>
  );
}
