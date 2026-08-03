import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Prévia (layout de referência): ficha completa do contato/parte. Espelha o
// print do ADVBOX adaptado — read-only até o domínio `contact` (v1).
const CAMPOS: { label: string; value: string }[] = [
  { label: "CPF/CNPJ", value: "439.823.208-79" },
  { label: "Origem da pessoa", value: "Parte contrária" },
  { label: "Tipo", value: "Pessoa física" },
  { label: "RG", value: "55.232.460-7" },
  { label: "Data de nascimento", value: "05/02/1997" },
  { label: "Estado civil", value: "Solteiro(a)" },
  { label: "Profissão", value: "—" },
  { label: "Celular", value: "—" },
  { label: "E-mail", value: "—" },
  { label: "CEP", value: "14407-316" },
  { label: "Estado", value: "São Paulo" },
  { label: "Cidade", value: "Franca" },
  { label: "Endereço", value: "Rua Luiz Orione, 290" },
  { label: "Bairro", value: "Parque Vicente Leporace I" },
];

export default async function ContatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <>
      <PageHeader
        title="Felipe Lopes de Oliveira"
        description="Cadastrado em 23/03/2022 · Parte contrária"
        action={<Badge variant="outline">Prévia</Badge>}
      />

      <section className="reveal bg-card mt-8 rounded-xl border p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {CAMPOS.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 border-b pb-1.5 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex justify-end">
          <Button disabled>Atualizar dados do contato</Button>
        </div>
      </section>
    </>
  );
}
