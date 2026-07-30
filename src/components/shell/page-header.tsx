export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  );
}

/** Placeholder de tela ainda não implementada (preenchida em fatias futuras). */
export function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="text-muted-foreground mt-6 flex items-center justify-center rounded-lg border border-dashed py-16 text-sm">
      {note ?? "Em construção — chega numa próxima fatia."}
    </div>
  );
}
