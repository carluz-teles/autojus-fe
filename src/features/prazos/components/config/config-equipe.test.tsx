import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useEquipe, useInvite } = vi.hoisted(() => ({
  useEquipe: vi.fn(),
  useInvite: vi.fn(),
}));
vi.mock("../../hooks/use-equipe", () => ({ useEquipe }));
vi.mock("../../hooks/use-invite", () => ({ useInvite }));
vi.mock("./invite-modal", () => ({ InviteModal: () => null }));
vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => children,
    Portal: ({ children }: { children: React.ReactNode }) => children,
    Backdrop: () => null,
    Popup: ({ children }: { children: React.ReactNode }) => children,
    Title: ({ children }: { children: React.ReactNode }) => children,
    Description: ({ children }: { children: React.ReactNode }) => children,
  },
}));

import { ConfigEquipe } from "./config-equipe";

beforeEach(() => {
  vi.clearAllMocks();
  useEquipe.mockReturnValue({
    lista: [
      {
        id: "member_1",
        ini: "PA",
        nome: "Patricia",
        email: "patricia@example.com",
        papel: "Advogado",
        papelCor: "var(--fg2)",
        isSelf: false,
        error: null,
        requestRemoval: vi.fn(),
      },
    ],
    isPending: false,
    error: null,
    refetch: vi.fn(),
    confirm: null,
    confirmId: null,
    setConfirmId: vi.fn(),
    removingId: null,
    selfKnown: true,
    remove: vi.fn(),
  });
  useInvite.mockReturnValue({
    isAdmin: true,
    abrir: vi.fn(),
    pendentes: [
      {
        id: "inv_1",
        email: "invite@example.com",
        papel: "Advogado",
        status: "pending",
        busy: null,
        error: null,
        reenviar: vi.fn(),
        revogar: vi.fn(),
      },
    ],
    invitationStatus: "pending",
    setInvitationStatus: vi.fn(),
    invitationPage: 0,
    invitationTotal: 21,
    invitationLoading: false,
    invitationError: null,
    nextInvitationPage: vi.fn(),
    previousInvitationPage: vi.fn(),
  });
});

describe("team controls", () => {
  it("keeps the original continuous panel, compact rows and gold pending treatment", () => {
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html.match(/surface-panel overflow-hidden/g)).toHaveLength(1);
    expect(html).toContain("border-b px-4 py-3");
    expect(html).toContain("size-[30px]");
    expect(html).toContain("color-mix(in oklch, var(--gold) 5%, transparent)");
  });
  it("retains member skeletons while invitation loading is independent", () => {
    useEquipe.mockReturnValue({ ...useEquipe(), isPending: true, lista: [] });
    useInvite.mockReturnValue({
      ...useInvite(),
      invitationLoading: true,
      pendentes: [],
    });
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html.match(/animate-pulse/g)).toHaveLength(9);
    expect(html).toContain("Carregando convites");
  });
  it("shows active access, pending invite actions and bounded pages", () => {
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html).toContain("Advogado · Ativo");
    expect(html).toContain("Convite pendente");
    expect(html).toContain("Reenviar");
    expect(html).toContain("Revogar");
    expect(html).toContain("Página 1 de 2");
    expect(html).toContain("Remover");
  });
  it("shows provider accepted state without pending actions", () => {
    useInvite.mockReturnValue({
      ...useInvite(),
      invitationStatus: "accepted",
      pendentes: [
        {
          id: "inv_2",
          email: "accepted@example.com",
          papel: "Advogado",
          status: "accepted",
          busy: null,
          error: null,
        },
      ],
    });
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html).toContain("Convite aceito");
    expect(html).not.toContain("Reenviar convite para");
    expect(html).not.toContain("Revogar convite de");
  });
  it("hides writes for non-admin and self, preserving read states", () => {
    useEquipe.mockReturnValue({
      ...useEquipe(),
      lista: [{ ...useEquipe().lista[0], isSelf: true }],
    });
    useInvite.mockReturnValue({ ...useInvite(), isAdmin: false });
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html).toContain("(Você)");
    expect(html).not.toContain("Convidar membro");
    expect(html).not.toContain("Reenviar convite para");
    expect(html).not.toContain("Remover Patricia");
  });
  it("distinguishes invitation errors from an empty member list", () => {
    useInvite.mockReturnValue({
      ...useInvite(),
      invitationError: new Error("offline"),
      pendentes: [],
    });
    const html = renderToStaticMarkup(<ConfigEquipe />);
    expect(html).toContain("Não foi possível carregar os convites");
    expect(html).toContain("Advogado · Ativo");
    expect(html).not.toContain("Nenhum convite com este status");
  });
});
