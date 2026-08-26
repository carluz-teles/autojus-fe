"use client";

// Modal "Nova peça" — o advogado escolhe a intimação de origem + o tipo de
// peça, e clicamos POST /v1/pecas (source=intimation), redirecionando pro
// fluxo padrão da peça (/pecas/:id → partida → construção → …).
//
// Lista de intimações: reusa o hook `useIntimacoes` com busca server-side
// e chip por urgência colorido (atraso/hoje/próximos dias). Sem paginação
// no modal — o Set inicial (~20 primeiros) já cobre triagem rápida; se o
// advogado quiser mais, a busca por texto/CNJ complementa.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/mock-ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoView } from "@/features/intimacoes/types";
import { useIntimacoesByProcesso } from "@/features/processos/hooks/use-processo-tabs";

// Closed set espelhando o BE (internal/draft/entity.go).
type PieceType = "DEFENSE" | "COMPLAINT" | "APPEAL" | "MOTION" | "OTHER";

const PIECE_TYPE_OPTIONS: { value: PieceType; label: string }[] = [
  { value: "DEFENSE", label: "Defesa" },
  { value: "COMPLAINT", label: "Petição inicial" },
  { value: "APPEAL", label: "Recurso" },
  { value: "MOTION", label: "Petição" },
  { value: "OTHER", label: "Outro" },
];

interface Props {
  aberto: boolean;
  onFechar: () => void;
  pieceTypeInicial?: PieceType;
  processoId?: string;
}

export function NovaPecaModal({
  aberto,
  onFechar,
  pieceTypeInicial = "DEFENSE",
  processoId,
}: Props) {
  const router = useRouter();

  // Os dois hooks são SEMPRE chamados incondicionalmente (regra dos hooks) —
  // cada um só fica relevante conforme `processoId` estar presente ou não.
  const geral = useIntimacoes(
    processoId ? { enabled: false } : { user_status: "PENDING" },
  );
  const porProcesso = useIntimacoesByProcesso(processoId ?? "");

  const [searchLocal, setSearchLocal] = useState("");

  // GET /v1/processos/:id/intimacoes não aceita filtro `user_status` —
  // aplicamos PENDING + busca por texto em memória (o limit=100 do hook já
  // cobre a lista inteira de um processo, sem paginação própria).
  const intimacoesPorProcessoFiltradas = useMemo(() => {
    if (!processoId) return [];
    const termo = searchLocal.trim().toLowerCase();
    return (porProcesso.data ?? []).filter((i) => {
      if (i.user_status !== "PENDING") return false;
      if (!termo) return true;
      return (
        i.cnj_number.toLowerCase().includes(termo) ||
        i.class.toLowerCase().includes(termo) ||
        i.subject.toLowerCase().includes(termo)
      );
    });
  }, [processoId, porProcesso.data, searchLocal]);

  const intimacoes = processoId
    ? intimacoesPorProcessoFiltradas
    : geral.intimacoes;
  const search = processoId ? searchLocal : geral.search;
  const setSearch = processoId ? setSearchLocal : geral.setSearch;
  const isPending = processoId ? porProcesso.isPending : geral.isPending;

  const [intimacaoId, setIntimacaoId] = useState<string>("");
  const [pieceType, setPieceType] = useState<PieceType>(pieceTypeInicial);

  // Nada de POST /v1/pecas aqui — o modal só coleta intimação + tipo e
  // navega. A criação da peça vive dentro de /pecas/nova (PartidaEphemeral),
  // que só cria quando o usuário confirma "Gerar" ou "Redigir manualmente".
  const continuar = () => {
    if (!intimacaoId) return;
    onFechar();
    router.push(
      `/pecas/nova?intimation_id=${encodeURIComponent(intimacaoId)}&piece_type=${encodeURIComponent(pieceType)}`,
    );
  };

  return (
    <Dialog aberto={aberto} titulo="Nova peça" onFechar={onFechar}>
      <p className="text-muted-foreground -mt-2 text-[12.5px] leading-relaxed">
        Toda peça nasce de uma intimação — escolha a de origem.
      </p>

      <div className="mt-4">
        <Rotulo>Intimação de origem</Rotulo>
        <input
          type="search"
          placeholder="Buscar por processo, título ou classe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-border bg-background focus:border-primary/50 mt-2 w-full rounded-md border px-3 py-2 text-[12.5px] outline-none"
        />
        <div className="border-border/60 bg-background/40 mt-2 max-h-72 overflow-y-auto rounded-md border">
          {isPending && intimacoes.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-[12px]">
              Carregando intimações…
            </p>
          ) : intimacoes.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-[12px]">
              Nenhuma intimação encontrada.
            </p>
          ) : (
            <ul className="divide-border/60 divide-y">
              {intimacoes.map((i) => (
                <IntimacaoRow
                  key={i.id}
                  intimacao={i}
                  checked={i.id === intimacaoId}
                  onSelect={() => setIntimacaoId(i.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Rotulo>Tipo de peça</Rotulo>
        <Select
          value={pieceType}
          onValueChange={(v) => setPieceType(v as PieceType)}
        >
          <SelectTrigger size="sm" className="mt-2 w-full">
            {/* Passa o label explícito — SelectValue default renderiza o `value`
                (ex.: DEFENSE) quando o SelectItem correspondente ainda não
                está montado no ciclo de render inicial. */}
            <SelectValue>
              {PIECE_TYPE_OPTIONS.find((o) => o.value === pieceType)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PIECE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={continuar} disabled={!intimacaoId}>
          Continuar
        </Button>
      </div>
    </Dialog>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function IntimacaoRow({
  intimacao: i,
  checked,
  onSelect,
}: {
  intimacao: IntimacaoView;
  checked: boolean;
  onSelect: () => void;
}) {
  const prazoLabel = useMemo(() => prazoLabelOf(i), [i]);
  return (
    <li>
      <label
        className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/40"}`}
      >
        <input
          type="radio"
          name="intimacao"
          checked={checked}
          onChange={onSelect}
          className="border-border text-primary mt-1 size-3.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[12.5px] font-medium">
            {i.class || i.subject || i.type}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px]">
            <span className="font-mono tabular-nums">{i.cnj_number}</span>
            {prazoLabel && (
              <>
                <span>·</span>
                <span className={prazoLabel.className}>{prazoLabel.text}</span>
              </>
            )}
          </div>
        </div>
      </label>
    </li>
  );
}

function prazoLabelOf(
  i: IntimacaoView,
): { text: string; className: string } | null {
  const d = i.prazo?.days_left;
  if (d === undefined || d === null)
    return { text: "sem prazo", className: "text-muted-foreground" };
  if (d < 0)
    return {
      text: `${Math.abs(d)} dias em atraso`,
      className: "text-destructive font-medium",
    };
  if (d === 0)
    return { text: "vence hoje", className: "text-amber-700 font-medium" };
  if (d === 1)
    return { text: "vence amanhã", className: "text-amber-700 font-medium" };
  return { text: `em ${d} dias`, className: "text-amber-700" };
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10.5px] font-medium tracking-[0.1em] uppercase">
      {children}
    </div>
  );
}
