import assert from "node:assert/strict";
import path from "node:path";

import { fixtureModuleURL as moduleURL } from "./fixture-module.mjs";

export async function comparisonBrowserChecks(browser, expect, output) {
  const { comparisonFixture } = await import(
    await moduleURL("comparison-fixture", {
      "./evaluation-fixture": await moduleURL("evaluation-fixture"),
    })
  );
  const { releaseFixture } = await import(await moduleURL("release-fixture"));
  const f = comparisonFixture();
  const release = {
    ...releaseFixture(),
    name: "Comparação sintética de intimações",
    manifest_digest: f.preview.selection.expected_manifest_digest,
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const commands = [],
    external = [],
    errors = [],
    unexpected = [];
  let created = false,
    withdrawn = false,
    thirdReady = false;
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
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
    if (method === "GET" && p.endsWith(`/dataset-releases/${f.ids.release}`))
      return reply({ data: { ...release, eligible: !withdrawn, withdrawn } });
    if (method === "GET" && p.endsWith("/evaluation-plans")) {
      const second = url.searchParams.has("cursor");
      return reply({
        data: second ? f.plans.slice(2) : f.plans.slice(0, 2),
        page: { next_cursor: second ? null : f.plans[1].id, limit: 20 },
      });
    }
    if (p.endsWith("/type-comparisons") && method === "GET") {
      const {
        source_reports: _refs,
        eligible: _eligible,
        blockers: _blockers,
        ...summary
      } = f.metadata;
      return reply({
        data: created ? [summary] : [],
        page: { next_cursor: null, limit: 20 },
      });
    }
    if (method === "GET" && p.endsWith(`/type-comparisons/${f.comparisonID}`))
      return reply({
        data: {
          ...f.metadata,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      });
    const isCreate = p.endsWith(
      `/dataset-releases/${f.ids.release}/type-comparisons`,
    );
    const isIssue = p.endsWith(`/type-comparisons/${f.comparisonID}/issue`);
    if (method === "POST" && (isCreate || isIssue)) {
      const body = req.postDataJSON();
      commands.push({ kind: isCreate ? "create" : "issue", body });
      assert.equal(body.confirmed_exposure, true);
      if (isCreate) assert.deepEqual(body.sources, f.refs);
      else assert.equal(body.expected_digest, f.delivery.digest);
      if (withdrawn)
        return reply({ kind: "CONFLICT", message: "Fonte retirada" }, 409);
      created = true;
      if (commands.length === 1) return route.abort("failed");
      return reply({
        data: {
          ...f.delivery,
          request_id: body.request_id,
          idempotent_replay: commands.length === 2,
        },
      });
    }
    const source = f.sources.find(
      (s) => p.includes(s.plan_id) || p.includes(s.run_id),
    );
    if (method === "GET" && source && p.endsWith("/run"))
      return reply({
        data: {
          ...f.run,
          id: source.run_id,
          plan_id: source.plan_id,
          state: "completed",
        },
      });
    if (method === "GET" && source && p.endsWith("/report")) {
      if (source === f.sources[2] && !thirdReady)
        return reply(
          { kind: "ENTITY_NOT_FOUND", message: "Relatório ausente" },
          404,
        );
      return reply({
        data: {
          id: source.report_id,
          run_id: source.run_id,
          plan_id: source.plan_id,
          definition_digest: f.plan.definition_digest,
          digest: "d".repeat(64),
          evaluator_version: "type-projection-v1",
          case_count: 1,
          generated_at: f.plan.frozen_at,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      });
    }
    unexpected.push(`${method} ${p}`);
    return reply(
      { kind: "INTERNAL", message: "Unexpected synthetic request" },
      500,
    );
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:3000/backoffice/releases/${f.ids.release}/comparisons`,
  );
  await expect(
    page.getByRole("heading", { name: "Comparar tipo do ato", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Carregar mais planos", exact: true })
    .click();
  for (const name of [/^A ·/, /^B ·/, /^C ·/])
    await page.getByRole("checkbox", { name }).check();
  await expect(
    page.getByText("Emita o relatório na página do plano antes de comparar.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comparar relatórios", exact: true }),
  ).toBeDisabled();
  assert.equal(commands.length, 0);
  thirdReady = true;
  await page
    .getByRole("button", { name: "Atualizar relatórios e histórico" })
    .click();
  const confirmation = page.getByRole("checkbox", {
    name: "Confirmo a exposição aos gabaritos e resultados destes casos.",
  });
  await expect(confirmation).toBeEnabled();
  await confirmation.check();
  await page
    .getByRole("button", { name: "Comparar relatórios", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar o mesmo pedido" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Atualizar relatórios e histórico" })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar o mesmo pedido" }),
  ).toBeVisible();
  assert.equal(commands.length, 1);
  await page.getByRole("button", { name: "Recuperar o mesmo pedido" }).click();
  await expect(
    page.getByRole("heading", { name: "Resultados pareados" }),
  ).toBeVisible();
  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0].body, commands[1].body);
  const report = page.getByRole("region", { name: "Comparação emitida" });
  await expect(
    report.getByRole("heading", { name: "Fonte 1 → Fonte 2" }),
  ).toBeVisible();
  await report
    .getByRole("heading", { name: "Resultados pareados" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "comparison-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await report
    .getByRole("heading", { name: "Resultados pareados" })
    .scrollIntoViewIfNeeded();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, "comparison-mobile.png") });
  await page
    .getByRole("link", { name: "Consultar esta comparação no histórico" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Comparação registrada" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Comparação registrada" }),
  ).toBeVisible();
  assert.equal(commands.length, 2);
  await expect(
    page.getByRole("heading", { name: "Resultados pareados" }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", {
      name: "Confirmo a exposição aos gabaritos e resultados destes casos.",
    })
    .check();
  await page
    .getByRole("button", { name: "Abrir resultados", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resultados pareados" }),
  ).toBeVisible();
  assert.equal(commands.length, 3);
  withdrawn = true;
  await page.getByRole("button", { name: "Atualizar acesso" }).click();
  await expect(
    page.getByText("Comparação indisponível:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resultados pareados" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Abrir resultados", exact: true }),
  ).toBeDisabled();
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  await context.close();
  return {
    passed: true,
    commands: commands.length,
    exactRecovery: true,
    reloadedWithoutExposure: true,
    missingReportBlocked: true,
    withdrawalBlocked: true,
    external,
    errors,
    unexpected,
    realBackend: false,
    realClerk: false,
    paidProviderCalls: 0,
  };
}
