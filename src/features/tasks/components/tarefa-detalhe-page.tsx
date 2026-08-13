"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { ApiError } from "@/lib/api/errors";

import { useTarefa } from "../hooks/use-tarefa";
import { TarefaDetalhe } from "./tarefa-detalhe";

// Página de deep-link do detalhe da tarefa (/tarefas/[id]). Busca a tarefa por id
// (GET /v1/tasks/:id), então abre para QUALQUER tarefa. Trata carregamento/erro/404
// aqui e delega o conteúdo (LEXIA · DetailLayout) para TarefaDetalhe. Espelha
// IntimacaoDetailPage / PrazoDetalhePage. Componente = binding.
export function TarefaDetalhePage({ id }: { id: string }) {
  const { tarefa, isPending, isError, error } = useTarefa(id);

  const notFound =
    error instanceof ApiError && error.kind === "ENTITY_NOT_FOUND";

  if (isPending) return <TarefaDetalhePageSkeleton />;

  if (isError || !tarefa) {
    return (
      <>
        <BackLink />
        <PageHeader
          title={notFound ? "Tarefa não encontrada" : "Erro ao carregar"}
          description={
            notFound
              ? "Ela pode ter sido removida ou o link está incorreto."
              : error instanceof ApiError
                ? error.message
                : "Tente novamente em instantes."
          }
        />
        <div className="reveal mt-8">
          <Link href="/tarefas" className="text-gold text-sm hover:underline">
            Voltar para as tarefas
          </Link>
        </div>
      </>
    );
  }

  return <TarefaDetalhe tarefa={tarefa} />;
}

function BackLink() {
  return (
    <div className="reveal mb-6">
      <Link
        href="/tarefas"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Tarefas
      </Link>
    </div>
  );
}

function TarefaDetalhePageSkeleton() {
  return (
    <div className="reveal flex flex-col gap-4">
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-muted h-8 w-64 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-9 w-96 animate-pulse rounded-lg" />
      <div className="bg-muted h-56 w-full animate-pulse rounded-xl" />
    </div>
  );
}
