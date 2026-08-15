"use client";

import { sanitizeContentHtml } from "@/lib/html/sanitize-content";

// Renderiza o teor bruto de uma intimação (texto puro, HTML inline ou um
// documento HTML inteiro colado pelo tribunal) já sanitizado — nunca aparece
// tag literal pro usuário, e links/tabelas/negrito viram estrutura real. Uso
// único em toda a feature (Detalhes + Análise), pra sanitização não duplicar.
export function DescriptionContent({ content }: { content: string }) {
  const html = sanitizeContentHtml(content);

  return (
    <div
      className="[&_a]:text-gold whitespace-pre-line [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-current/10 [&_td]:p-1.5 [&_td]:align-top [&_th]:border [&_th]:border-current/10 [&_th]:p-1.5 [&_th]:text-left"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
