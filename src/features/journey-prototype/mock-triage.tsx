"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ListToolbar } from "@/components/shell/list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetField,
  SheetSection,
} from "@/components/ui/sheet";
import { Responsavel } from "@/features/organization/components/responsavel";
import { cn } from "@/lib/utils";

import { useInAppMock } from "./in-app-state";
import { filterTriage } from "./triage-data";

export function MockTriage() {
  const { journeys, concludeAnalysis } = useInAppMock();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const pending = journeys.filter((item) => !item.works.length);
  const filtered = filterTriage(journeys, search, owner, deadline);
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const review = pending.filter((item) => reviewIds.includes(item.id));
  const checkedCount = rows.filter((item) => selected.has(item.id)).length;

  function resetSelection() {
    setSelected(new Set());
    setPage(0);
  }
  function toggle(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function confirm() {
    const ids = review.map((item) => item.id);
    concludeAnalysis(ids);
    setCompleted(ids);
    setSelected(new Set());
    setReviewIds([]);
  }

  return (
    <>
      <div className="-mx-4 -mt-5 sm:-mx-6">
        <ListToolbar
          search={search}
          onSearch={(value) => {
            setSearch(value);
            resetSelection();
          }}
          searchLabel="Buscar intimações"
          placeholder="Buscar por processo, partes ou assunto…"
          filters={[
            {
              key: "owner",
              label: "Responsável",
              value: owner,
              options: [...new Set(pending.map((item) => item.owner))]
                .sort()
                .map((name) => ({ value: name, label: name })),
              onChange: (value) => {
                setOwner(value);
                resetSelection();
              },
            },
            {
              key: "deadline",
              label: "Prazo",
              value: deadline,
              options: [{ value: "unconfirmed", label: "A confirmar" }],
              onChange: (value) => {
                setDeadline(value);
                resetSelection();
              },
            },
          ]}
          active={[
            ...(owner
              ? [
                  {
                    key: "owner",
                    label: owner,
                    remove: () => {
                      setOwner("");
                      resetSelection();
                    },
                  },
                ]
              : []),
            ...(deadline
              ? [
                  {
                    key: "deadline",
                    label: "Prazo a confirmar",
                    remove: () => {
                      setDeadline("");
                      resetSelection();
                    },
                  },
                ]
              : []),
          ]}
          onClear={() => {
            setSearch("");
            setOwner("");
            setDeadline("");
            resetSelection();
          }}
        />
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-3 text-xs"
          role="status"
        >
          <span className="font-medium tabular-nums">
            {pending.length} para analisar
          </span>
          <span className="text-muted-foreground">
            {filtered.length} neste recorte
          </span>
          <span className="text-muted-foreground">
            {pending.filter((item) => item.due === "A confirmar").length} com
            prazo a confirmar
          </span>
        </div>
        {selected.size ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs">
              {selected.size} selecionadas nesta página
            </span>
            <Button size="sm" onClick={() => setReviewIds([...selected])}>
              Revisar seleção
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Limpar seleção
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            240 publicações fictícias na entrada
          </span>
        )}
      </div>
      {completed.length ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 border-y py-3 text-xs"
        >
          <Badge variant="success">{completed.length} encaminhada(s)</Badge>
          <span>Saíram da triagem e continuam em Providências · A fazer.</span>
          <Link
            className="text-primary font-medium underline underline-offset-4"
            href={
              completed.length === 1
                ? `/dev/fluxo/providencias/${completed[0]}-plan`
                : "/dev/fluxo/pipeline"
            }
          >
            Ver {completed.length === 1 ? "providência" : "providências"}
          </Link>
        </div>
      ) : null}
      <div className="border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border bg-muted/30 flex items-center gap-4 border-b px-4 py-2.5 sm:px-5">
          <Checkbox
            aria-label="Selecionar esta página"
            checked={rows.length > 0 && checkedCount === rows.length}
            indeterminate={checkedCount > 0 && checkedCount < rows.length}
            disabled={!rows.length}
            onCheckedChange={(checked) =>
              setSelected(
                checked ? new Set(rows.map((item) => item.id)) : new Set(),
              )
            }
          />
          <div
            aria-hidden
            className="text-muted-foreground hidden flex-1 grid-cols-[minmax(0,1fr)_180px_180px] gap-5 text-[11px] font-medium tracking-wide uppercase lg:grid"
          >
            <span>Intimação / processo</span>
            <span>Vencimento</span>
            <span>Responsável / situação</span>
          </div>
          <span className="text-muted-foreground text-xs lg:hidden">
            Selecionar página
          </span>
        </div>
        {rows.length ? (
          <ul
            className="divide-border divide-y"
            aria-label="Intimações para analisar"
          >
            {rows.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "hover:bg-muted/25 flex min-w-0 gap-4 px-4 py-4 transition-colors sm:px-5",
                  selected.has(item.id) && "bg-primary/5",
                )}
              >
                <div className="pt-1">
                  <Checkbox
                    aria-label={`Selecionar ${item.reference}`}
                    checked={selected.has(item.id)}
                    onCheckedChange={(checked) => toggle(item.id, checked)}
                  />
                </div>
                <article className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px] lg:gap-5">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setReviewIds([item.id])}
                      className="font-display text-foreground focus-visible:ring-ring hover:text-primary rounded text-left text-base leading-snug font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                    >
                      {item.subject}
                    </button>
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      {item.reference}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {item.title}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Publicação: {item.publication}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs lg:sr-only">
                      Vencimento
                    </p>
                    <p className="text-base font-semibold tabular-nums">
                      {item.due}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.due === "A confirmar"
                        ? "Requer conferência do advogado"
                        : "Data demonstrativa"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs lg:sr-only">
                      Responsável
                    </p>
                    <Responsavel value={item.owner} nome={item.owner} />
                    <div className="mt-2">
                      <Badge variant="secondary">Pendente de análise</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewIds([item.id])}
                      aria-label={`Analisar ${item.reference}`}
                      className="text-primary focus-visible:ring-ring mt-3 inline-flex items-center gap-1 rounded text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                    >
                      Analisar intimação
                      <ChevronRight className="size-3" aria-hidden />
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Inbox}
            title="Nenhuma intimação neste recorte"
            description="Revise os filtros. Os itens já analisados continuam em Intimações e Providências."
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs tabular-nums">
          Mostrando {filtered.length ? currentPage * pageSize + 1 : 0} a{" "}
          {Math.min((currentPage + 1) * pageSize, filtered.length)} de{" "}
          {filtered.length}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            size="sm"
            aria-label="Itens por página"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              resetSelection();
            }}
          >
            {[10, 25, 50].map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size} por página
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <span className="text-muted-foreground text-xs">
            Página {currentPage + 1} de {lastPage + 1}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={currentPage === 0}
            onClick={() => {
              setPage(currentPage - 1);
              setSelected(new Set());
            }}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Próxima página"
            disabled={currentPage === lastPage}
            onClick={() => {
              setPage(currentPage + 1);
              setSelected(new Set());
            }}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <Sheet
        open={review.length > 0}
        onOpenChange={(open) => {
          if (!open) setReviewIds([]);
        }}
      >
        <SheetContent
          title={
            review.length === 1
              ? review[0].subject
              : `Revisar ${review.length} intimações`
          }
          description="Simulação: confira o conteúdo antes de encaminhar. Nenhum aceite no tribunal ou confirmação de prazo será realizado."
          footer={
            <>
              <Button variant="outline" onClick={() => setReviewIds([])}>
                Voltar à lista
              </Button>
              <Button onClick={confirm} disabled={!review.length}>
                Encaminhar · simular
                <ArrowRight data-icon="inline-end" />
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            {review.map((item) => (
              <section
                key={item.id}
                className="flex flex-col gap-4 border-b pb-5 last:border-0"
              >
                <div>
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.reference}
                  </p>
                </div>
                <dl>
                  <SheetField label="Publicação">{item.publication}</SheetField>
                  <SheetField label="Responsável">{item.owner}</SheetField>
                  <SheetField label="Prazo preservado">{item.due}</SheetField>
                </dl>
                <SheetSection title="Teor da publicação">
                  {item.excerpt}
                </SheetSection>
                <SheetSection title="Destino após análise" accent>
                  Providências → A fazer
                  <br />
                  {item.id === "analysis"
                    ? "Definir estratégia da manifestação"
                    : `Analisar ${item.subject.toLowerCase()}`}
                  <br />
                  <span className="text-muted-foreground">
                    Responsável: {item.owner}. Nenhuma peça será gerada nesta
                    etapa.
                  </span>
                </SheetSection>
                <Link
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  href={`/dev/fluxo/intimacoes/${item.id}`}
                >
                  Consultar intimação completa
                </Link>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
