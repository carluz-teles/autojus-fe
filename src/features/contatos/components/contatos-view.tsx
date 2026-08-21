"use client";

import { useState } from "react";

import { CelulaDupla, DataTable } from "@/components/mock-ui/data-table";
import { PageHeader } from "@/components/mock-ui/layout";
import { Badge } from "@/components/mock-ui/status-badge";
import {
  type EstadoFiltro,
  FilterBar,
  FILTRO_VAZIO,
  passaFiltro,
} from "@/features/shared/filtros";
import { useContatos } from "@/features/shared/hooks";
import { formatarData } from "@/lib/utils";

export function ContatosView() {
  const { data, isLoading } = useContatos();
  const [filtro, setFiltro] = useState<EstadoFiltro>(FILTRO_VAZIO);

  const todos = data ?? [];
  const visiveis = todos.filter((c) =>
    passaFiltro(
      {
        urgencia: "sem",
        texto: [c.nome, c.papel, c.cidade, c.celular].join(" · "),
      },
      filtro,
    ),
  );

  if (isLoading) return <div className="p-8">Carregando…</div>;

  return (
    <div className="px-8 pt-6 pb-10">
      <PageHeader
        titulo="Contatos"
        descricao="Clientes e partes envolvidas nos processos."
        acoes={
          <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-[11.5px]">
            Prévia
          </span>
        }
      >
        <FilterBar
          tela="contatos"
          filtro={filtro}
          onChange={setFiltro}
          placeholder="Buscar por nome, documento ou cidade…"
        />
      </PageHeader>

      <DataTable
        larguraMinima="980px"
        colunas={[
          { label: "Nome", largura: "320px" },
          { label: "Papel", largura: "146px" },
          { label: "Celular", largura: "140px" },
          { label: "Cidade", largura: "126px" },
          { label: "Processos", largura: "104px" },
          { label: "Cadastro", largura: "118px" },
        ]}
        rodape={`Mostrando ${visiveis.length} de ${todos.length}`}
        onLimpar={() => setFiltro(FILTRO_VAZIO)}
        linhas={visiveis.map((c) => ({
          id: c.id,
          celulas: [
            <CelulaDupla key="n" principal={c.nome} />,
            <Badge key="p">{c.papel}</Badge>,
            <span key="c" className="text-muted-foreground tabular-nums">
              {c.celular}
            </span>,
            <span key="ci" className="text-muted-foreground">
              {c.cidade}
            </span>,
            <span key="pr" className="text-muted-foreground tabular-nums">
              {c.processos}
            </span>,
            <span key="ca" className="text-muted-foreground tabular-nums">
              {formatarData(c.cadastro)}
            </span>,
          ],
        }))}
      />
    </div>
  );
}
