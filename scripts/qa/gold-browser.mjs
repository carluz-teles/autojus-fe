import assert from "node:assert/strict";
import path from "node:path";
export async function goldBrowserChecks(browser, expect, output) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    external = [],
    errors = [],
    writes = [];
  let gold = null,
    withdrawn = false;
  const preview = {
    decision_id: "synthetic-decision",
    task_id: "synthetic-task",
    source_link_id: "synthetic-source",
    revision: 0,
    previous_revision_id: null,
    origin: "synthetic",
    quality: "assisted_reviewed",
    split: "train",
    legal_date: "2026-09-30",
    purposes: ["evaluation"],
    policy_version: "annotation-gold-policy-v1",
    eligible: true,
    blockers: [],
  };
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === "http://127.0.0.1:3000") return route.continue();
    if (url.origin !== "http://127.0.0.1:18080") {
      external.push(url.origin);
      return route.abort();
    }
    const reply = (data, status = 200) =>
      route.fulfill({ status, headers, json: data });
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (request.method() === "GET" && url.pathname.endsWith("/gold-candidates"))
      return reply({
        data: [
          {
            task_id: preview.task_id,
            batch_id: "batch",
            decision_id: preview.decision_id,
            decision_revision: 1,
            outcome: "insufficient",
            origin: "synthetic",
            quality: preview.quality,
            split: preview.split,
            recorded_at: "2026-09-30T12:00:00Z",
            latest_gold_id: gold?.id ?? null,
          },
        ],
        page: { next_cursor: null, limit: 20 },
      });
    if (request.method() === "GET" && url.pathname.endsWith("/gold-preview"))
      return reply({
        data: {
          ...preview,
          revision: gold ? 1 : 0,
          previous_revision_id: gold?.id ?? null,
          eligible: !withdrawn,
          blockers: withdrawn ? ["withdrawn_decision_requires_new_review"] : [],
        },
      });
    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/gold-revisions")
    ) {
      const body = request.postDataJSON();
      writes.push(body);
      if (!gold) {
        gold = {
          ...preview,
          id: "synthetic-gold",
          revision: 1,
          previous_revision_id: null,
          legal_valid_from: body.legal_valid_from,
          legal_valid_until: body.legal_valid_until,
          purposes: body.purposes,
          reason: body.reason,
          content_digest: "a".repeat(64),
          recorded_at: "2026-09-30T12:00:00Z",
          idempotent_replay: false,
        };
        return route.abort("failed");
      }
      assert.deepEqual(writes[0], body);
      return reply({ data: { ...gold, idempotent_replay: true } });
    }
    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/gold-revisions/synthetic-gold")
    )
      return reply({
        data: {
          ...gold,
          eligible: !withdrawn,
          blockers: withdrawn
            ? ["gold_withdrawn", "withdrawn_decision_requires_new_review"]
            : [],
        },
      });
    if (
      request.method() === "POST" &&
      url.pathname.endsWith("/gold-revisions/synthetic-gold/withdrawals")
    ) {
      const body = request.postDataJSON();
      assert(body.reason);
      withdrawn = true;
      return reply({
        data: {
          id: "withdrawal",
          gold_id: gold.id,
          source_link_id: null,
          privacy_policy_revision: null,
          reason: body.reason,
          recorded_at: "2026-09-30T12:05:00Z",
          idempotent_replay: false,
        },
      });
    }
    throw new Error(
      `Unexpected synthetic gold API: ${request.method()} ${url.pathname}`,
    );
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:3000/backoffice/gold");
  await page
    .getByRole("link", { name: "Conferir promoção", exact: true })
    .click();
  await page.getByLabel("Avaliação", { exact: true }).check();
  await page.getByLabel("Vigência jurídica — início").fill("2026-09-01");
  await page
    .getByLabel("Motivo da promoção")
    .fill("Promoção sintética validada para teste da interface.");
  await page
    .getByLabel("Conferi a decisão, as finalidades e a vigência desta revisão.")
    .check();
  await page
    .getByRole("button", { name: "Registrar gold", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar promoção" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar gold", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Recuperar promoção" }).click();
  await page
    .getByRole("link", { name: "Consultar revisão e elegibilidade atual" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão 1 · Sintético" }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "gold-revision-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Motivo da retirada")
    .fill("Retirada sintética para verificar bloqueio.");
  await page
    .getByLabel("Confirmo a retirada permanente desta revisão.")
    .check();
  await page.getByRole("button", { name: "Retirar gold", exact: true }).click();
  await expect(
    page.getByText("Retirada registrada.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Esta revisão já foi retirada.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "gold-withdrawn-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  assert.equal(writes.length, 2);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await context.close();
  return {
    promoted: true,
    identicalRecoveryRequests: 2,
    withdrawalVisibleAfterReload: true,
    externalRequests: 0,
    pageErrors: 0,
    paidProviderCalls: 0,
  };
}
