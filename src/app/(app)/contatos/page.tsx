import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Prévia (layout de referência): CRM leve de contatos (clientes e partes).
// Hoje as partes vivem em intimation.recipients (jsonb); um `contact`
// first-class é decisão de v1 — esta tela documenta o destino.
const SAMPLE = [
  {
    id: "1",
    nome: "A. C. DE OLIVEIRA PLASTIFICAÇÃO",
    celular: "(16) 99364-9635",
    cidade: "Franca",
    cadastro: "23/03/2022",
  },
  {
    id: "2",
    nome: "FELIPE LOPES DE OLIVEIRA",
    celular: "—",
    cidade: "Franca",
    cadastro: "23/03/2022",
  },
];

export default function ContatosPage() {
  return (
    <>
      <PageHeader
        title="Contatos"
        description="Clientes e partes envolvidas nos processos."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">Prévia</Badge>
            <Button size="sm" disabled>
              Novo contato
            </Button>
          </div>
        }
      />

      <div className="reveal bg-card mt-8 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Celular</th>
              <th className="px-5 py-3 font-medium">Cidade</th>
              <th className="px-5 py-3 font-medium">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SAMPLE.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-4">
                  <Link
                    href={`/contatos/${row.id}`}
                    className="hover:text-gold font-medium underline-offset-4 hover:underline"
                  >
                    {row.nome}
                  </Link>
                </td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.celular}
                </td>
                <td className="text-muted-foreground px-5 py-4">{row.cidade}</td>
                <td className="text-muted-foreground px-5 py-4 tabular-nums">
                  {row.cadastro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
