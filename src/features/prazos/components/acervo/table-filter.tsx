"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  GitBranch,
  Landmark,
  ListFilter,
  type LucideIcon,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

// Filtro de tabela — um grupo (Situação/Tribunal/Grau/Responsável/…): rótulo +
// ícone + opções (a 1ª sempre "Todos", value ""). value = seleção atual.
export interface FilterGroup {
  key: string;
  label: string;
  icon: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}

const ICONS: Record<string, LucideIcon> = {
  situacao: CircleDot,
  tribunal: Landmark,
  grau: GitBranch,
  responsavel: User,
  tipo: ListFilter,
};

// Popover "Filtrar" estilo Linear (dois níveis): lista "FILTRAR POR" → drill-in
// nas opções do grupo escolhido (com voltar). Os filtros ativos viram chips
// removíveis à esquerda do botão. Reutilizável por qualquer tabela (Processos,
// Intimações, …). Componente = JSX + binding; o estado dos filtros vive no hook
// da página, só o aberto/drill (UI efêmera) mora aqui.
export function TableFilter({ groups }: { groups: FilterGroup[] }) {
  const [aberto, setAberto] = useState(false);
  const [drill, setDrill] = useState<string | null>(null);

  if (groups.length === 0) return null;

  const ativos = groups.filter((g) => g.value);
  const grupo = groups.find((g) => g.key === drill) ?? null;
  const rotuloOpcao = (g: FilterGroup) =>
    g.options.find((o) => o.value === g.value)?.label ?? g.value;

  const fechar = () => {
    setAberto(false);
    setDrill(null);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* chips dos filtros ativos */}
      {ativos.map((g) => (
        <button
          key={g.key}
          onClick={() => g.onChange("")}
          className="border-line bg-panel text-fg2 hover:bg-hover inline-flex h-8 items-center gap-1.5 rounded-lg border pr-1.5 pl-2.5 text-[12px]"
        >
          <span className="text-fg3">{g.label}:</span>
          <span className="font-medium">{rotuloOpcao(g)}</span>
          <X className="text-fg3 size-3" strokeWidth={2} />
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setAberto((v) => !v)}
          className="border-line bg-panel text-fg2 hover:bg-hover flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px]"
        >
          <ListFilter className="size-3.5" strokeWidth={1.8} />
          Filtrar
        </button>

        {aberto ? (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={fechar}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div className="border-line bg-panel absolute top-9 right-0 z-40 w-[224px] overflow-hidden rounded-[10px] border py-1.5 shadow-[0_8px_32px_oklch(0.27_0.012_200/16%)]">
              {grupo ? (
                <>
                  <button
                    onClick={() => setDrill(null)}
                    className="text-fg2 hover:bg-hover flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium"
                  >
                    <ChevronLeft
                      className="text-fg3 size-3.5"
                      strokeWidth={2}
                    />
                    {grupo.label}
                  </button>
                  <div className="bg-line2 mx-2.5 my-1 h-px" />
                  {grupo.options.map((o) => {
                    const sel = o.value === grupo.value;
                    return (
                      <button
                        key={o.value || "__todos"}
                        onClick={() => {
                          grupo.onChange(o.value);
                          fechar();
                        }}
                        className="hover:bg-hover flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {o.label}
                        </span>
                        {sel ? (
                          <Check
                            className="text-primary size-3.5 flex-none"
                            strokeWidth={2.2}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="text-fg3 px-3 pt-1 pb-1.5 text-[10px] font-medium tracking-[0.06em] uppercase">
                    Filtrar por
                  </div>
                  {groups.map((g) => {
                    const Icon = ICONS[g.icon] ?? CircleDot;
                    return (
                      <button
                        key={g.key}
                        onClick={() => setDrill(g.key)}
                        className="hover:bg-hover flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]"
                      >
                        <Icon
                          className="text-fg3 size-[15px] flex-none"
                          strokeWidth={1.8}
                        />
                        <span className="flex-1">{g.label}</span>
                        {g.value ? (
                          <span className="bg-primary size-1.5 flex-none rounded-full" />
                        ) : (
                          <ChevronRight
                            className="text-fg3 size-3.5 flex-none"
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
