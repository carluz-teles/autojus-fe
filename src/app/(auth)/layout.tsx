import { Wordmark } from "@/components/shell/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="reveal flex flex-col items-center gap-4 text-center">
        <Wordmark />
        <div className="max-w-sm">
          <h1 className="font-display text-2xl leading-tight tracking-tight text-balance">
            Sua assessoria jurídica, no automático.
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Monitore processos, prazos e publicações em um só lugar.
          </p>
        </div>
      </div>
      <div className="reveal" style={{ animationDelay: "80ms" }}>
        {children}
      </div>
    </div>
  );
}
