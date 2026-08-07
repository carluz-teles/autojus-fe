export function BillingSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-muted/40 h-48 animate-pulse rounded-xl border"
        />
      ))}
    </div>
  );
}
