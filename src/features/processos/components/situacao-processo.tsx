import { Badge } from "@/components/ui/badge";
import type { situacaoProcesso } from "@/features/processos/lib/apresentacao";

export function ProcessoSituacao({
  situacao,
}: {
  situacao: ReturnType<typeof situacaoProcesso>;
}) {
  return (
    <div className="space-y-1.5">
      <Badge variant={situacao.variant}>{situacao.label}</Badge>
      <details className="text-muted-foreground text-xs">
        <summary className="focus-visible:ring-ring w-fit cursor-pointer rounded py-1 underline-offset-4 hover:underline focus-visible:ring-2">
          {situacao.resumo} · ver origem
        </summary>
        <div className="border-border mt-2 space-y-2 border-l-2 pl-3 leading-relaxed">
          <p>{situacao.motivo}</p>
          {situacao.movimento ? (
            <p>
              {situacao.movimento} · {situacao.dataMovimento}
            </p>
          ) : null}
          <p>Fonte: {situacao.fonte}</p>
          <p>Dados consultados: {situacao.consulta}</p>
          <p>A situação do processo não encerra seus prazos.</p>
        </div>
      </details>
    </div>
  );
}
