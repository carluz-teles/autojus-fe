export function ConfirmingPayment() {
  return (
    <div
      role="status"
      className="reveal bg-card/40 mt-8 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center"
    >
      <p className="text-foreground/80 text-sm font-medium">
        Confirmando sua assinatura…
      </p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Isso pode levar alguns instantes enquanto confirmamos o retorno da
        Stripe.
      </p>
    </div>
  );
}
