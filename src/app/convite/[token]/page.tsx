import { ConviteAccept } from "@/features/convite/components/convite-accept";

export const metadata = { title: "Convite · Atjus" };

// Rota PÚBLICA (convidado chega deslogado) — fora de (app), sem shell/gate.
// Next 16: params é assíncrono (Promise).
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ConviteAccept token={token} />;
}
