import { FilePlus2, LayoutTemplate, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

// Prévia (layout de referência): produção de peças com IA (domínio advisory:
// draft → review → petition). É o downstream da cadeia — nasce, também, de dentro
// da intimação+IA ("gerar a peça que a IA recomendou"). v1+.
const MODELOS = [
  { id: "1", nome: "Modelo de procuração", atualizado: "15 out 2019" },
  { id: "2", nome: "Procuração geral — escritório", atualizado: "12 jan 2022" },
];

export default function PecasPage() {
  return (
    <>
      <PageHeader
        title="Peças"
        description="Minutas geradas com IA a partir dos autos — revisão com citações antes de protocolar."
        action={<Badge variant="outline">Prévia</Badge>}
      />

      <section className="reveal mt-8">
        <h2 className="text-sm font-medium">Iniciar uma nova peça</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StartCard
            href="/pecas/nova"
            icon={Sparkles}
            title="Gerar com IA"
            hint="a partir de um processo"
          />
          <StartCard
            href="/pecas/nova"
            icon={FilePlus2}
            title="Em branco"
            hint="do zero"
          />
          <StartCard
            href="/pecas/nova"
            icon={LayoutTemplate}
            title="De um modelo"
            hint="biblioteca"
          />
        </div>
      </section>

      <section className="reveal mt-10">
        <h2 className="text-sm font-medium">Modelos do escritório</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {MODELOS.map((m) => (
            <Link
              key={m.id}
              href={`/pecas/${m.id}`}
              className="bg-card hover:border-gold/40 group rounded-xl border p-4 transition-colors"
            >
              <div className="bg-muted/50 flex aspect-[3/4] items-center justify-center rounded-lg">
                <LayoutTemplate className="text-muted-foreground/50 size-8" />
              </div>
              <p className="group-hover:text-gold mt-3 truncate text-sm font-medium">
                {m.nome}
              </p>
              <p className="text-muted-foreground/70 mt-0.5 text-xs">
                Atualizado {m.atualizado}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function StartCard({
  href,
  icon: Icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-gold/40 group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-center transition-colors"
    >
      <Icon className="text-gold size-6" />
      <span className="group-hover:text-gold text-sm font-medium">{title}</span>
      <span className="text-muted-foreground/70 text-xs">{hint}</span>
    </Link>
  );
}
