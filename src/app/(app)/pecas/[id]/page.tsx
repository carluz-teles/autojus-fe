import { ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Prévia (layout de referência): editor de minuta com IA. Duas colunas — a peça
// (draft) e o painel de revisão (review) com achados + CITAÇÕES dos autos e a
// cobertura (verificado / não verificado). Espelha o estilo "assistente IA".
export default async function PecaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <div className="reveal grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl leading-none tracking-tight">
              Manifestação — Cumprimento de sentença
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              0005746-66.2025.8.26.0196 · rascunho
            </p>
          </div>
          <Badge variant="outline">Prévia</Badge>
        </div>

        <div className="bg-card mt-6 rounded-xl border p-6">
          <div className="text-muted-foreground flex min-h-96 items-center justify-center rounded-lg border border-dashed text-center text-sm">
            <span className="max-w-sm px-4">
              Editor da minuta. A IA redige a partir dos autos (document/chunk)
              e você revisa antes de assinar e protocolar.
            </span>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled>
              Salvar rascunho
            </Button>
            <Button disabled>Assinar e protocolar</Button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="text-gold size-4" /> Revisão da IA
          </h2>
          <p className="text-muted-foreground mt-3 text-xs">
            Cada afirmação da peça é checada contra os autos e recebe uma
            citação. Pontos sem base são sinalizados.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Finding ok label="Prazo de 10 dias" cite="fl. 142 — certidão" />
            <Finding
              ok
              label="Valor exequendo"
              cite="fl. 3 — nota promissória"
            />
            <Finding label="Endereço do executado" cite="sem base nos autos" />
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 text-sm">
          <p className="text-muted-foreground text-xs">Cobertura</p>
          <p className="font-display mt-1 text-2xl leading-none tabular-nums">
            2/3{" "}
            <span className="text-muted-foreground text-sm">verificado</span>
          </p>
        </div>
      </aside>
    </div>
  );
}

function Finding({
  label,
  cite,
  ok,
}: {
  label: string;
  cite: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-2.5">
      <ShieldCheck
        className={
          ok
            ? "size-4 shrink-0 text-emerald-600"
            : "text-muted-foreground/50 size-4 shrink-0"
        }
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{cite}</p>
      </div>
    </div>
  );
}
