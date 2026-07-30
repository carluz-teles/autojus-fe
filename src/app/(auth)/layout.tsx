export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-lg font-semibold tracking-tight">
          jus-assessoria
        </span>
        <span className="text-muted-foreground text-sm">
          Assessoria jurídica automatizada
        </span>
      </div>
      {children}
    </div>
  );
}
