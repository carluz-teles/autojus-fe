import { describe, expect, it } from "vitest";

import type { CertificateView } from "@/features/configuracoes/types/certificado";
import type { CourtConnectionView } from "@/features/configuracoes/types/court-connection";

import { courtAccess, usableCertificates } from "./import-readiness";

describe("preparação da importação", () => {
  it("não considera certificado expirado, futuro ou revogado pronto", () => {
    const certificate = {
      not_before: "2026-01-01",
      not_after: "2027-01-01",
      revoked_at: null,
    } as CertificateView;
    expect(
      usableCertificates(
        [
          certificate,
          { ...certificate, not_after: "2026-01-02" },
          { ...certificate, not_before: "2027-01-01" },
          { ...certificate, revoked_at: "2026-01-02" },
        ],
        Date.parse("2026-09-06"),
      ),
    ).toEqual([certificate]);
  });
  it("uma conexão de outro tribunal não libera os autos deste processo", () => {
    const conn = {
      court: "TJSP",
      system: "EPROC",
      status: "CONNECTED",
    } as CourtConnectionView;
    expect(courtAccess([conn], "TJRS")).toBe("missing");
    expect(courtAccess([conn], "TJSP")).toBe("connected");
    expect(
      courtAccess([{ ...conn, status: "MFA_ENROLLMENT_REQUIRED" }], "TJSP"),
    ).toBe("mfa");
    expect(courtAccess([{ ...conn, status: "ERROR" }], "TJSP")).toBe("error");
  });
});
