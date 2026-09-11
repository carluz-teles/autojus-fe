import { Check, Circle, FileText, Loader2 } from "lucide-react";

const STEPS = [
  "Reunindo o contexto",
  "Analisando autos e fundamentos",
  "Preparando a redação",
];
const STAGES: Record<string, number> = {
  loading_context: 0,
  retrieving_sources: 1,
  analyzing_sources: 1,
  drafting_sections: 2,
  safe_fallback: 2,
  auditing_draft: 2,
};

const LABELS: Record<string, string> = {
  waiting: "Aguardando o início da preparação…",
  loading_context: "Reunindo o contexto do processo…",
  retrieving_sources: "Localizando os autos e as referências selecionadas…",
  analyzing_sources: "Analisando os autos e os fundamentos…",
  drafting_sections:
    "Preparando a redação. A folha abrirá com o primeiro trecho…",
  safe_fallback: "Preparando uma nova tentativa de redação…",
  auditing_draft: "Conferindo a minuta antes de disponibilizar o texto…",
};

export function GenerationLoading({
  stage,
  connectionError,
}: {
  stage: string;
  connectionError: boolean;
}) {
  const current = STAGES[stage] ?? -1;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <div className="bg-primary/5 text-primary grid size-20 place-items-center rounded-full border">
        <FileText className="size-8" aria-hidden />
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-primary text-xs font-medium tracking-widest uppercase">
          Preparação da peça
        </p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Preparando o caminho para a sua peça.
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Reunimos o contexto e analisamos suas fontes. No primeiro trecho, a
          folha abre para você acompanhar a escrita em tempo real.
        </p>
      </div>
      <p role="status" className="text-primary flex items-center gap-2 text-sm">
        {!connectionError && current === -1 && (
          <Loader2
            aria-hidden
            className="size-4 shrink-0 motion-safe:animate-spin"
          />
        )}
        {connectionError
          ? "Acompanhamento temporariamente indisponível. A geração pode continuar; verificaremos o resultado automaticamente."
          : (LABELS[stage] ?? "Acompanhando a preparação…")}
      </p>
      <ol className="flex flex-col gap-4" aria-label="Etapas de preparação">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 text-sm"
            aria-current={index === current ? "step" : undefined}
          >
            {index < current ? (
              <Check aria-hidden className="text-primary size-4" />
            ) : index === current ? (
              <Loader2
                aria-hidden
                className="text-primary size-4 motion-safe:animate-spin"
              />
            ) : (
              <Circle aria-hidden className="text-muted-foreground size-4" />
            )}
            {step}
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground border-t pt-5 text-xs">
        Etapas informadas pelo processamento real. Nada será assinado ou
        protocolado. A revisão final é sua.
      </p>
    </div>
  );
}
