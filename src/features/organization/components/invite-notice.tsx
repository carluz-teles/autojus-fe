// Aviso mostrado acima do widget do Clerk em /sign-up e /sign-in quando o
// usuário chegou por um link de convite de organização (Clerk anexa
// __clerk_ticket + __clerk_status=sign_up|sign_in na URL de redirect
// configurada no Account Portal). Convite só existe pra tenant que já
// completou o onboarding, então quem aceita vai direto pro dashboard depois
// de autenticar — sem passar pelo wizard de criação de escritório.
export function InviteNotice({ mode }: { mode: "sign_up" | "sign_in" }) {
  return (
    <p className="max-w-sm rounded-xl border border-[color-mix(in_oklch,var(--success)_25%,transparent)] bg-[color-mix(in_oklch,var(--success)_7%,transparent)] p-3.5 text-center text-[13px] leading-relaxed">
      Você foi convidado para um escritório.{" "}
      {mode === "sign_up"
        ? "Crie sua conta para aceitar o convite."
        : "Entre na sua conta para aceitar o convite."}
    </p>
  );
}
