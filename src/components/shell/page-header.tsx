export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="reveal flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl leading-none tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Placeholder de tela ainda não implementada (preenchida em fatias futuras). */
export function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="reveal bg-card/40 mt-8 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
      <p className="text-foreground/80 text-sm font-medium">Em construção</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        {note ?? "Esta tela chega numa próxima fatia."}
      </p>
    </div>
  );
}
