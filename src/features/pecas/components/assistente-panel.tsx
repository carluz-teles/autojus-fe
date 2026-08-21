"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/mock-ui/button";
import { Avatar } from "@/components/mock-ui/data-display";
import { Input } from "@/components/mock-ui/input";
import { Segmented } from "@/components/mock-ui/layout";
import { formatarDataHora } from "@/lib/utils";

export interface Sugestao {
  id: string;
  tipo: string;
  texto: string;
  paragrafo: number;
  cor: string;
  fundo: string;
}

/** Paleta fixa: o número e a cor do cartão são os mesmos do marcador na margem. */
export const SUGESTOES: Sugestao[] = [
  {
    id: "s1",
    tipo: "Clareza",
    texto:
      "Substituir “por meio de seu advogado infra-assinado” por “representada por seu advogado abaixo assinado”.",
    paragrafo: 3,
    cor: "var(--gold)",
    fundo: "color-mix(in oklch, var(--gold) 14%, transparent)",
  },
  {
    id: "s2",
    tipo: "Fundamentação",
    texto: "Citar o art. 917, VI do CPC ao impugnar a higidez do título.",
    paragrafo: 6,
    cor: "var(--info)",
    fundo: "color-mix(in oklch, var(--info) 14%, transparent)",
  },
  {
    id: "s3",
    tipo: "Pedido",
    texto:
      "Explicitar o pedido de condenação da exequente ao pagamento de honorários.",
    paragrafo: 7,
    cor: "var(--primary)",
    fundo: "color-mix(in oklch, var(--primary) 12%, transparent)",
  },
];

const MENSAGENS = [
  {
    autor: "Você",
    quando: "2026-08-19T10:12:00",
    texto:
      "Quais teses de defesa cabem numa execução por nota promissória sem contrato?",
  },
  {
    autor: "Assistente",
    quando: "2026-08-19T10:12:30",
    texto:
      "Nos autos há três caminhos: (1) impugnar a higidez do título pela ausência de causa debendi, art. 917, VI do CPC; (2) alegar prescrição — a nota venceu em 03/2023, dentro do triênio, então esta é fraca aqui; (3) excesso de execução, já que a memória de cálculo aplica juros acima do contratado. Sugiro estruturar em (1) e (3).",
  },
  {
    autor: "Você",
    quando: "2026-08-19T10:14:00",
    texto: "Confere se o prazo é em dias úteis.",
  },
  {
    autor: "Assistente",
    quando: "2026-08-19T10:14:20",
    texto:
      "Sim. A intimação do Juizado Especial abre 5 dias úteis a contar de 13/08/2026, com termo final em 19/08/2026. O prazo já está confirmado na intimação de origem.",
  },
];

const ATALHOS = [
  "Resumir os autos",
  "Sugerir teses",
  "Conferir o prazo",
  "Encontrar precedentes",
];

export function AssistentePanel({
  foco,
  onFocar,
}: {
  foco: string | null;
  onFocar: (id: string | null) => void;
}) {
  const [aba, setAba] = useState<"sugestoes" | "chat">("sugestoes");
  const [aplicadas, setAplicadas] = useState<Record<string, boolean>>({});

  return (
    <aside className="border-border flex min-h-0 flex-col border-l">
      <div className="border-border border-b p-4">
        <Segmented
          className="w-full"
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: "sugestoes", label: "Sugestões", contagem: "3" },
            { valor: "chat", label: "Chat" },
          ]}
        />
      </div>

      {aba === "sugestoes" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="text-muted-foreground mb-3.5 text-[12.5px] leading-relaxed">
              Três sugestões apontam para trechos do editor.
            </p>
            {SUGESTOES.map((s, i) => (
              <div
                key={s.id}
                className="bg-card ring-hairline mb-3 rounded-xl border-l-[3px] p-3"
                style={{ borderLeftColor: s.cor }}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Ver o parágrafo"
                    onClick={() => onFocar(foco === s.id ? null : s.id)}
                    className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border text-[10.5px] font-medium"
                    style={{
                      borderColor: s.cor,
                      background: s.fundo,
                      color: s.cor,
                    }}
                  >
                    {i + 1}
                  </button>
                  <span
                    className="text-[10.5px] tracking-[0.08em] uppercase"
                    style={{ color: s.cor }}
                  >
                    {s.tipo}
                  </span>
                  <span className="text-muted-foreground ml-auto text-[11px]">
                    Parágrafo {s.paragrafo}
                  </span>
                </div>
                <p className="my-1.5 text-[12.5px] leading-relaxed">
                  {s.texto}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11.5px]"
                    onClick={() =>
                      setAplicadas((a) => ({ ...a, [s.id]: true }))
                    }
                  >
                    {aplicadas[s.id] ? "Aplicada" : "Aplicar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11.5px]"
                  >
                    Descartar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-border flex flex-col gap-2 border-t p-4">
            <Button variant="outline" size="sm">
              Revisar com IA
            </Button>
            <Button size="sm">Regenerar minuta</Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
            {MENSAGENS.map((m) => (
              <div
                key={m.quando}
                className="grid grid-cols-[26px_minmax(0,1fr)] gap-2.5"
              >
                <Avatar
                  nome={m.autor === "Você" ? "Luan Gomes" : "IA"}
                  size={26}
                  destaque={m.autor !== "Você"}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium">{m.autor}</span>
                    <span className="text-muted-foreground text-[10.5px] tabular-nums">
                      {formatarDataHora(m.quando)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed">
                    {m.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-border border-t p-4">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {ATALHOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className="border-border bg-card text-muted-foreground hover:text-primary cursor-pointer rounded-full border px-2.5 py-1 text-[11.5px] hover:border-[color-mix(in_oklch,var(--primary)_40%,transparent)]"
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Pergunte sobre os autos ou a peça…" />
              <Button size="icon" title="Enviar">
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
