import assert from "node:assert/strict";
import path from "node:path";

export async function withdrawalBrowserChecks(browser, expect, output) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    external = [],
    errors = [],
    writes = [];
  const source = "11111111-1111-4111-8111-111111111111";
  const base = {
    affected_sources: 2,
    gold_revisions: 2,
    releases: 1,
    publications: 1,
    already_withdrawn: false,
    group_withdrawn: false,
    policy_active: null,
    withdrawal: null,
  };
  let sourceImpact = {
      ...base,
      scope: "source",
      target: source,
      digest: "a".repeat(64),
    },
    policyImpact = {
      ...base,
      scope: "privacy_policy",
      target: "7",
      digest: "c".repeat(64),
      policy_active: true,
    };
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  const pageData = (data) => ({ data, page: { next_cursor: null, limit: 20 } });
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname,
      method = req.method();
    if (url.origin === "http://127.0.0.1:3000") return route.continue();
    if (url.origin !== "http://127.0.0.1:18080") {
      external.push(url.origin);
      return route.abort();
    }
    const reply = (data, status = 200) =>
      route.fulfill({ headers, status, json: data });
    if (method === "OPTIONS") return route.fulfill({ headers, status: 204 });
    if (method === "GET" && p.endsWith("/withdrawal-sources"))
      return reply(
        pageData([
          {
            id: source,
            origin: "synthetic",
            source_kind: "intimation",
            matter_key: "civil",
            legal_date: "2026-09-30",
            recorded_at: "2026-09-30T12:00:00Z",
            privacy_policy_revision: null,
            withdrawn: sourceImpact.already_withdrawn,
          },
        ]),
      );
    if (method === "GET" && p.endsWith("/withdrawal-policies"))
      return reply(
        pageData([
          {
            revision: 7,
            active: true,
            configured_at: "2026-09-30T12:00:00Z",
            source_count: 2,
            withdrawn: policyImpact.already_withdrawn,
          },
        ]),
      );
    const isSource = p.includes(`/intimation-sources/${source}/`),
      isPolicy = p.includes("/privacy-policies/7/");
    if (
      (isSource || isPolicy) &&
      method === "GET" &&
      p.endsWith("/withdrawal-preview")
    )
      return reply({ data: isSource ? sourceImpact : policyImpact });
    if (
      (isSource || isPolicy) &&
      method === "POST" &&
      p.endsWith("/withdrawals")
    ) {
      const body = req.postDataJSON();
      writes.push({ scope: isSource ? "source" : "privacy_policy", body });
      if (isSource && writes.length === 1) {
        assert.equal(body.expected_impact_digest, sourceImpact.digest);
        sourceImpact = { ...sourceImpact, digest: "b".repeat(64), releases: 2 };
        return reply(
          {
            kind: "CONFLICT",
            message:
              "O impacto mudou. Atualize e confirme novamente a retirada.",
          },
          409,
        );
      }
      if (isSource && sourceImpact.withdrawal) {
        assert.deepEqual(body, writes[1].body);
        return reply({
          data: { ...sourceImpact.withdrawal, idempotent_replay: true },
        });
      }
      assert.equal(
        body.expected_impact_digest,
        (isSource ? sourceImpact : policyImpact).digest,
      );
      const receipt = {
        id: isSource ? "source-receipt" : "policy-receipt",
        gold_id: null,
        source_link_id: isSource ? source : null,
        privacy_policy_revision: isSource ? null : 7,
        reason: body.reason,
        recorded_at: "2026-09-30T12:05:00Z",
        idempotent_replay: false,
      };
      if (isSource) {
        sourceImpact = {
          ...sourceImpact,
          digest: "d".repeat(64),
          already_withdrawn: true,
          group_withdrawn: true,
          withdrawal: receipt,
        };
        return route.abort("failed");
      }
      policyImpact = {
        ...policyImpact,
        digest: "e".repeat(64),
        already_withdrawn: true,
        withdrawal: receipt,
      };
      return reply({ data: receipt });
    }
    throw new Error(`Unexpected withdrawal fixture: ${method} ${p}`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:3000/backoffice/withdrawals");
  await page.getByRole("link", { name: "Conferir impacto da origem" }).click();
  const confirm = page.getByLabel(
    "Conferi o impacto e confirmo a retirada permanente deste alvo.",
  );
  await page
    .getByLabel("Motivo da retirada")
    .fill("Retirada sintética para conferir impacto e recuperação.");
  await confirm.check();
  await page
    .getByRole("button", { name: "Registrar retirada", exact: true })
    .click();
  await expect(
    page.getByText(
      "O impacto mudou. Atualize e confirme novamente a retirada.",
      { exact: true },
    ),
  ).toHaveText("O impacto mudou. Atualize e confirme novamente a retirada.");
  assert.equal(writes.length, 1);
  await page.getByRole("button", { name: "Atualizar impacto" }).click();
  await expect(
    page.getByRole("button", { name: "Atualizar impacto" }),
  ).toBeEnabled();
  await confirm.uncheck();
  await confirm.check();
  await page.screenshot({
    path: path.join(output, "source-withdrawal-impact-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Registrar retirada", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar retirada do alvo" }),
  ).toBeVisible();
  // Refresh may discover that the first request committed despite response loss.
  // Its receipt must not hide recovery of the exact pending request.
  await page.getByRole("button", { name: "Atualizar impacto" }).click();
  await expect(
    page.getByRole("heading", { name: "Retirada já registrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recuperar retirada do alvo" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recuperar retirada do alvo" })
    .click();
  await expect(
    page.getByText("Retirada registrada. Novos usos estão bloqueados;", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Retirada já registrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar retirada", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Voltar às origens e políticas" })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("link", { name: "Conferir impacto da política 7" })
    .click();
  await expect(
    page.getByText("A configuração global da política permanece ativa.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo da retirada")
    .fill("Retirada sintética limitada a este workspace.");
  await confirm.check();
  await page
    .getByRole("button", { name: "Registrar retirada", exact: true })
    .click();
  await expect(
    page.getByText("Retirada registrada. Novos usos estão bloqueados;", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Retirada já registrada" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "policy-withdrawn-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(writes.length, 4);
  assert.deepEqual(writes[1], writes[2]);
  assert.notEqual(writes[0].body.request_id, writes[1].body.request_id);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
  return {
    staleImpactRejected: true,
    recoveryAfterReceiptRefresh: true,
    identicalRecovery: true,
    policyRemainsGloballyActive: true,
    withdrawalVisibleAfterReload: true,
    paidProviderCalls: 0,
    externalRequests: 0,
    pageErrors: 0,
  };
}
