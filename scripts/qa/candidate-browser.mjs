import assert from "node:assert/strict";
import path from "node:path";

import { fixtureModuleURL } from "./fixture-module.mjs";

export async function candidateBrowserChecks(browser, expect, output) {
  const comparisonURL = await fixtureModuleURL("comparison-fixture", {
    "./evaluation-fixture": await fixtureModuleURL("evaluation-fixture"),
  });
  const { candidateFixture } = await import(
    await fixtureModuleURL("candidate-fixture", {
      "./comparison-fixture": comparisonURL,
    })
  );
  const f = candidateFixture(),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
  const page = await context.newPage(),
    commands = [],
    errors = [],
    external = [],
    unexpected = [];
  let created = false,
    withdrawn = false,
    revoked = false;
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
    if (revoked)
      return reply({ kind: "FORBIDDEN", message: "Acesso revogado" }, 403);
    if (method === "GET" && p.endsWith(`/type-comparisons/${f.comparisonID}`))
      return reply({
        data: {
          ...f.metadata,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      });
    if (method === "GET" && p.endsWith("/type-candidates")) {
      const second = url.searchParams.has("cursor");
      return reply({
        data: created
          ? [
              second
                ? { ...f.summary, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }
                : f.summary,
            ]
          : [],
        page: {
          next_cursor: created && !second ? f.candidateID : null,
          limit: 20,
        },
      });
    }
    if (method === "GET" && p.endsWith(`/type-candidates/${f.candidateID}`))
      return reply({
        data: {
          ...f.candidate,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      });
    if (method === "POST" && p.endsWith("/issue")) {
      const body = req.postDataJSON();
      commands.push({ kind: "issue", body });
      return reply({ data: { ...f.delivery, request_id: body.request_id } });
    }
    if (method === "POST" && p.endsWith("/candidates")) {
      const body = req.postDataJSON();
      commands.push({ kind: "freeze", body });
      if (!created) {
        created = true;
        return route.abort("failed");
      }
      return reply({
        data: {
          ...f.candidate,
          request_id: body.request_id,
          idempotent_replay: true,
        },
      });
    }
    unexpected.push(`${method} ${p}`);
    return reply(
      { kind: "INTERNAL", message: "Unexpected synthetic request" },
      500,
    );
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:3000/backoffice/comparisons/${f.comparisonID}/candidate`,
  );
  await expect(
    page.getByRole("heading", { name: "Selecionar candidato de tipo" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Conferir seleção", exact: true }),
  ).toBeDisabled();
  assert.equal(commands.length, 0);
  await page
    .getByRole("checkbox", {
      name: "Confirmo a exposição aos gabaritos e resultados destes casos.",
    })
    .check();
  await page
    .getByRole("button", {
      name: "Abrir comparação para selecionar",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Conferir seleção", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Conferir seleção", exact: true })
    .click();
  await expect(
    page.getByText("Escolha se este estrato terá critérios próprios.").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Congelar candidato", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Fonte de referência", { exact: true })
    .selectOption(f.form.baseline);
  await page
    .getByLabel("Fonte candidata", { exact: true })
    .selectOption(f.form.candidate);
  for (const [label, value] of [
    ["Mínimo de casos", "1"],
    ["Mínimo de grupos", "1"],
    ["Mínimo aceitável (%)", "100"],
    ["Máximo com sinal crítico (%)", "0"],
    ["Máximo indisponível (%)", "0"],
    ["Máximo de regressões (%)", "0"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  for (const select of await page
    .getByRole("combobox", { name: /^Critérios para / })
    .all())
    await select.selectOption("omit");
  await page
    .getByLabel("Justificativa da seleção", { exact: true })
    .fill(f.form.reason);
  await page
    .getByRole("button", { name: "Conferir seleção", exact: true })
    .click();
  const confirmation = page.getByRole("checkbox", {
    name: "Confirmo estas fontes, critérios e justificativa para congelar o candidato.",
  });
  await confirmation.check();
  await page.getByLabel("Mínimo aceitável (%)", { exact: true }).fill("99,99");
  await expect(confirmation).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Congelar candidato", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Mínimo aceitável (%)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Conferir seleção", exact: true })
    .click();
  await confirmation.check();
  await page
    .getByRole("button", { name: "Congelar candidato", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar seleção original" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Fonte candidata", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Atualizar acesso e histórico" })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar seleção original" }),
  ).toBeVisible();
  assert.equal(commands.length, 2);
  await page.getByRole("button", { name: "Carregar mais candidatos" }).click();
  await expect(
    page.getByRole("link", { name: /^Candidato bbbbbbbb/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Recuperar seleção original" })
    .click();
  const title = page.getByRole("heading", {
    name: "Candidato congelado",
    exact: true,
  });
  await expect(title).toBeVisible();
  assert.equal(commands.length, 3);
  assert.deepEqual(commands[1].body, commands[2].body);
  assert.deepEqual(commands[2].body.policy, f.policy);
  await title.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: path.join(output, "candidate-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await title.evaluate((e) => e.scrollIntoView({ block: "start" }));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, "candidate-mobile.png") });
  await page
    .getByRole("link", { name: "Consultar candidato aaaaaaaa", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seleção registrada", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(title).toBeVisible();
  assert.equal(commands.length, 3);
  withdrawn = true;
  await page.getByRole("button", { name: "Atualizar candidato" }).click();
  await expect(
    page.getByText("Candidato inelegível:", { exact: false }),
  ).toBeVisible();
  revoked = true;
  await page.getByRole("button", { name: "Atualizar candidato" }).click();
  await expect(
    page.getByText("Não foi possível consultar o candidato.", { exact: false }),
  ).toBeVisible();
  await expect(title).toHaveCount(0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.deepEqual(unexpected, []);
  await context.close();
  return {
    passed: true,
    commands: commands.length,
    exactRecovery: true,
    explicitCriteria: true,
    historyPagination: true,
    reloadWithoutPost: true,
    withdrawalVisible: true,
    revocationHides: true,
    realBackend: false,
    realClerk: false,
    paidProviderCalls: 0,
    external,
    errors,
    unexpected,
  };
}
