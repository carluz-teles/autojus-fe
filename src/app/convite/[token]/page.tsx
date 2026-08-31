import { redirect } from "next/navigation";

export const metadata = { title: "Convite · Atjus" };

// Aceite de convite = fluxo PADRÃO do Clerk (decisão: sem login custom). O e-mail
// de convite do Clerk já leva o convidado a /sign-up?__clerk_ticket=…, tratado
// pelos componentes padrão. Esta rota antiga (mock ATJ-…) só existe pra não quebrar
// links salvos: redireciona pro cadastro, onde o ticket do Clerk assume.
// Next 16: params é assíncrono (Promise).
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params;
  redirect("/sign-up");
}
