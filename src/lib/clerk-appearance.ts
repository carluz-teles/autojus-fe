// Harmoniza os componentes prebuilt do Clerk (SignIn/SignUp/UserButton/
// OrganizationSwitcher) com o design "Ledger". Mapeia para os CSS vars do tema —
// assim o Clerk acompanha a paleta sem duplicar valores (fonte única no globals.css).
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    colorDanger: "var(--destructive)",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    card: "border border-border shadow-lg",
    cardBox: "shadow-none",
    headerTitle: "font-display tracking-tight",
    footerActionLink: "text-primary hover:text-primary/80",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 normal-case",
  },
};
