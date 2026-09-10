import { FolderOpen } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShellBackLink, ShellHeader } from "@/components/shell/page-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("shared editorial primitives", () => {
  it("keeps back navigation a named link, not a nested button", () => {
    const html = renderToStaticMarkup(
      <ShellBackLink href="/processos" label="Voltar aos processos" />,
    );
    expect(html).toContain('href="/processos"');
    expect(html).toContain('aria-label="Voltar aos processos"');
    expect(html).not.toContain("<button");
  });

  it("preserves the compact shell and page heading", () => {
    const html = renderToStaticMarkup(
      <ShellHeader>
        <h1>Processos</h1>
      </ShellHeader>,
    );
    expect(html).toContain('data-slot="shell-header"');
    expect(html).toContain("<h1>Processos</h1>");
  });

  it("renders card content and readable empty state without icon-only information", () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Autos</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FolderOpen}
            title="Nenhum documento"
            description="Os documentos importados aparecerão aqui."
          />
        </CardContent>
      </Card>,
    );
    expect(html).toContain("Nenhum documento");
    expect(html).toContain("Os documentos importados aparecerão aqui.");
    expect(html).toContain('aria-hidden="true"');
  });

  it("row actions have one named trigger and preserve disabled empty menus", () => {
    const enabled = renderToStaticMarkup(
      <RowActions
        label="Ações do processo"
        items={[{ label: "Abrir", href: "/processos/123" }]}
      />,
    );
    expect(enabled).toContain('aria-label="Ações do processo"');
    expect(enabled).toContain('aria-haspopup="menu"');
    expect(enabled.match(/<button\b/g)).toHaveLength(1);
    const disabled = renderToStaticMarkup(<RowActions items={[]} />);
    expect(disabled).toContain("disabled");
  });

  it("keeps table column semantics and labels", () => {
    const html = renderToStaticMarkup(
      <DataTable
        rows={[{ id: "1" }]}
        rowKey={(r) => r.id}
        columns={[{ key: "id", header: "Processo", cell: (r) => r.id }]}
      />,
    );
    expect(html).toContain('scope="col"');
    expect(html).toContain("Processo");
  });

  it("keeps inactive mounted panels hidden and active tabs focusable", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="fontes">
        <TabsList aria-label="Contexto">
          <TabsTrigger value="fontes">Fontes</TabsTrigger>
          <TabsTrigger value="teses">Teses</TabsTrigger>
        </TabsList>
        <TabsContent value="fontes">Documentos</TabsContent>
        <TabsContent value="teses" keepMounted>
          Fundamentos
        </TabsContent>
      </Tabs>,
    );
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('hidden=""');
    expect(html).toContain('aria-label="Contexto"');
  });
});
