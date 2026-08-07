export function BillingAdminOnlyNotice() {
  return (
    <div className="reveal bg-card/40 mt-8 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
      <p className="text-foreground/80 text-sm font-medium">Acesso restrito</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Somente administradores da organização podem gerenciar a assinatura.
      </p>
    </div>
  );
}
