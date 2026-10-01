import assert from "node:assert/strict";
import path from "node:path";

import { fixtureModuleURL } from "./fixture-module.mjs";

export async function closedTestBrowserChecks(browser, expect, output) {
  const candidateURL = await fixtureModuleURL("candidate-fixture", {
    "./comparison-fixture": await fixtureModuleURL("comparison-fixture", {
      "./evaluation-fixture": await fixtureModuleURL("evaluation-fixture"),
    }),
  });
  const { closedTestFixture } = await import(
    await fixtureModuleURL("closed-test-fixture", {
      "./candidate-fixture": candidateURL,
      "./release-fixture": await fixtureModuleURL("release-fixture"),
    })
  );
  const f = closedTestFixture();
  f.candidate.closed_test_available = true;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    commands = [],
    errors = [],
    external = [],
    unexpected = [];
  let reservation = null,
    run = null,
    issued = false,
    revoked = false;
  const lost = new Set();
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname,
      post = req.method() === "POST";
    if (url.origin === "http://127.0.0.1:3000") return route.continue();
    if (url.origin !== "http://127.0.0.1:18080") {
      external.push(url.origin);
      return route.abort();
    }
    const reply = (data, status = 200) =>
      route.fulfill({ headers, status, json: data });
    if (req.method() === "OPTIONS")
      return route.fulfill({ headers, status: 204 });
    if (revoked)
      return reply({ kind: "FORBIDDEN", message: "Acesso revogado" }, 403);
    if (p.endsWith(`/type-candidates/${f.candidateID}`))
      return reply({ data: f.candidate });
    if (p.endsWith(`/dataset-releases/${f.ids.release}`))
      return reply({ data: f.release });
    if (p.endsWith("/closed-test-preview") && post) {
      const selection = req.postDataJSON();
      commands.push({ kind: "preview", body: selection });
      return reply({ data: { ...f.preview, selection } });
    }
    let kind;
    if (p.endsWith("/closed-test-reservation")) kind = "reserve";
    else if (p.endsWith("/run")) kind = "run";
    else if (p.endsWith("/report")) kind = "report";
    else {
      unexpected.push(`${req.method()} ${p}`);
      return reply(
        { kind: "INTERNAL", message: "Unexpected mock request" },
        500,
      );
    }
    if (post) {
      const body = req.postDataJSON();
      commands.push({ kind, body });
      if (kind === "reserve")
        reservation = {
          ...f.reservation,
          request_id: body.request_id,
          preview: { ...f.preview, selection: body.selection },
        };
      if (kind === "run")
        run = {
          ...f.run,
          request_id: body.request_id,
          state: "queued",
          finished_at: null,
          work_counts: { queued: 2 },
        };
      if (kind === "report") {
        issued = true;
        reservation = {
          ...reservation,
          eligible: false,
          blockers: ["test_exposed"],
        };
        run = { ...run, eligible: false, blockers: ["test_exposed"] };
      }
      if (!lost.has(kind)) {
        lost.add(kind);
        return route.abort("failed");
      }
      return reply({
        data:
          kind === "reserve"
            ? reservation
            : kind === "run"
              ? run
              : {
                  ...f.delivery,
                  request_id: body.request_id,
                  idempotent_replay: true,
                },
      });
    }
    if (kind === "report" && !issued)
      return reply({ kind: "ENTITY_NOT_FOUND", message: "Ausente" }, 404);
    return reply({
      data:
        kind === "reserve" ? reservation : kind === "run" ? run : f.metadata,
    });
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:3000/backoffice/type-candidates/${f.candidateID}`,
  );
  await page.getByRole("link", { name: "Consultar teste fechado" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Teste fechado de tipo do ato",
      exact: true,
    }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Conferir conjunto e orçamento" }),
  ).toBeEnabled();
  assert.equal(commands.length, 0);
  await page
    .getByLabel("Justificativa da reserva", { exact: true })
    .fill("Teste sintético da jornada completa.");
  await page
    .getByRole("button", { name: "Conferir conjunto e orçamento" })
    .click();
  const reserve = page.getByRole("button", {
    name: "Reservar teste fechado",
    exact: true,
  });
  await expect(reserve).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /Confirmo esta reserva única/ })
    .check();
  await page.getByLabel("Máximo de casos", { exact: true }).fill("99");
  await expect(reserve).toHaveCount(0);
  await page
    .getByRole("button", { name: "Conferir conjunto e orçamento" })
    .click();
  await page
    .getByRole("checkbox", { name: /Confirmo esta reserva única/ })
    .check();
  await page.screenshot({
    path: path.join(output, "closed-test-reservation.png"),
    fullPage: true,
  });
  await reserve.click();
  const recover = page.getByRole("button", {
    name: "Recuperar envio do teste",
  });
  await expect(recover).toBeVisible();
  await page.getByRole("button", { name: "Atualizar teste fechado" }).click();
  const execute = page.getByRole("button", {
    name: "Iniciar teste fechado",
    exact: true,
  });
  await expect(execute).toBeDisabled();
  await recover.click();
  await expect(
    page.getByRole("checkbox", { name: /Autorizo esta execução/ }),
  ).toBeEnabled();
  assert.deepEqual(
    commands.filter((c) => c.kind === "reserve")[0].body,
    commands.filter((c) => c.kind === "reserve")[1].body,
  );
  assert.equal(commands.filter((c) => c.kind === "run").length, 0);
  await page.getByRole("checkbox", { name: /Autorizo esta execução/ }).check();
  await execute.click();
  await expect(recover).toBeVisible();
  await recover.click();
  await expect(page.getByText("Na fila · 1 casos pareados")).toBeVisible();
  assert.deepEqual(
    commands.filter((c) => c.kind === "run")[0].body,
    commands.filter((c) => c.kind === "run")[1].body,
  );
  assert.equal(commands.filter((c) => c.kind === "report").length, 0);
  run = { ...f.run };
  await page.getByRole("button", { name: "Atualizar teste fechado" }).click();
  const reportConsent = page.getByRole("checkbox", {
    name: /Confirmo que a abertura registra/,
  });
  await expect(reportConsent).toBeEnabled();
  await reportConsent.check();
  await page.getByRole("button", { name: "Abrir relatório fechado" }).click();
  await expect(recover).toBeVisible();
  await recover.click();
  const report = page.getByRole("region", {
    name: "Relatório do teste fechado",
  });
  await expect(report).toBeVisible();
  assert.deepEqual(
    commands.filter((c) => c.kind === "report")[0].body,
    commands.filter((c) => c.kind === "report")[1].body,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "closed-test-report-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const before = commands.length;
  await page.reload();
  await expect(reportConsent).toBeEnabled();
  await expect(report).toHaveCount(0);
  assert.equal(commands.length, before);
  await reportConsent.check();
  await page.getByRole("button", { name: "Abrir relatório fechado" }).click();
  await expect(report).toBeVisible();
  revoked = true;
  await page.getByRole("button", { name: "Atualizar teste fechado" }).click();
  await expect(report).toHaveCount(0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.deepEqual(unexpected, []);
  await context.close();
  return {
    realBackend: false,
    realClerk: false,
    paidProviderCalls: 0,
    commands: commands.length,
    externalRequests: external,
    pageErrors: errors,
    cases: [
      "candidate entry",
      "no automatic dispatch or exposure",
      "preview edit invalidates consent",
      "exact recovery of all three commands",
      "single run and separate exposure",
      "report after dispatch blocked",
      "reload requires audited delivery",
      "revocation hides report",
      "mobile without overflow",
    ],
  };
}
