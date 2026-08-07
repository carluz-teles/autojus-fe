import { Button } from "@/components/ui/button";

export function BillingError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-dashed p-6"
    >
      <p className="text-destructive text-sm">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRetry()}
      >
        Tentar novamente
      </Button>
    </div>
  );
}
