import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";

// Prévia (layout de referência): detalhe do processo consolidado. As abas
// mapeiam os domínios que penduram no court_record: andamentos (docket_entry),
// intimações, prazos (deadline), peças (draft/petition), documentos.
const TABS = [
  "Resumo",
  "Andamentos",
  "Intimações",
  "Prazos",
  "Peças",
  "Documentos",
];

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <>
      <PageHeader
        title="0005746-66.2025.8.26.0196"
        description="Paulo da Silva Prolheti Franca ME × Thayla Lais Carmozine · Execução de título extrajudicial · TJSP"
        action={<Badge variant="outline">Prévia</Badge>}
      />

      <nav className="reveal mt-6 flex flex-wrap gap-1 border-b">
        {TABS.map((tab, i) => (
          <span
            key={tab}
            className={
              i === 0
                ? "border-gold text-foreground -mb-px border-b-2 px-3 py-2 text-sm font-medium"
                : "text-muted-foreground px-3 py-2 text-sm"
            }
          >
            {tab}
          </span>
        ))}
      </nav>

      <section className="reveal mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-xl border p-5 lg:col-span-2">
          <h2 className="font-display text-lg leading-none tracking-tight">
            Linha do tempo
          </h2>
          <div className="text-muted-foreground mt-4 flex min-h-40 items-center justify-center rounded-lg border border-dashed text-center text-sm">
            <span className="max-w-xs px-4">
              Os andamentos (DATAJUD) e as intimações (DJEN) deste processo
              aparecem aqui após o sync.
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display text-lg leading-none tracking-tight">
            Dados do tribunal
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Grau" value="—" />
            <Field label="Órgão julgador" value="—" />
            <Field label="Classe" value="—" />
            <Field label="Assunto" value="—" />
            <Field label="Ajuizamento" value="—" />
            <Field label="Sigilo" value="Público" />
          </dl>
        </div>
      </section>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
