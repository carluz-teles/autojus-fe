// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { errors } = vi.hoisted(() => ({
  errors: {
    firstName: { message: "Informe seu nome." },
    lastName: { message: "Informe seu sobrenome." },
  },
}));

vi.mock("../hooks/use-personal-profile", () => ({
  usePersonalProfile: () => ({
    form: {
      register: (name: string) => ({ name }),
      formState: { errors },
    },
    submit: vi.fn(),
    error: "",
    saving: false,
  }),
}));

import { PersonalProfile } from "./personal-profile";

const user = {
  firstName: null,
  lastName: null,
  primaryEmailAddress: { emailAddress: "user@example.com" },
};

describe("PersonalProfile", () => {
  it("associates each invalid name input with its own inline error", () => {
    const doc = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <PersonalProfile user={user} onComplete={vi.fn()} />,
      ),
      "text/html",
    );

    for (const name of ["firstName", "lastName"]) {
      const input = doc.querySelector<HTMLInputElement>(
        `input[name="${name}"]`,
      );
      expect(input?.getAttribute("aria-invalid")).toBe("true");
      const errorId = input?.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      expect(doc.getElementById(errorId!)?.getAttribute("role")).toBe("alert");
      expect(doc.getElementById(errorId!)?.textContent).toBe(
        errors[name as keyof typeof errors].message,
      );
      expect(doc.querySelector(`label[for="${input?.id}"]`)).not.toBeNull();
    }
    expect(
      doc.querySelector('input[type="email"]')?.hasAttribute("readonly"),
    ).toBe(true);
  });

  it("keeps field and error IDs unique across profile instances", () => {
    const doc = new DOMParser().parseFromString(
      renderToStaticMarkup(
        <>
          <PersonalProfile user={user} onComplete={vi.fn()} />
          <PersonalProfile user={user} onComplete={vi.fn()} />
        </>,
      ),
      "text/html",
    );
    const ids = [...doc.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
