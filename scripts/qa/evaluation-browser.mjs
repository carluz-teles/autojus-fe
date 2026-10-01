import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

export async function evaluationBrowserChecks(browser, expect, output) {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const ts = require("typescript");
  const source = await fs.readFile(
    "src/features/curation/__tests__/evaluation-fixture.ts",
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const { evaluationFixture, typeEvaluationFixture } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
  const f = evaluationFixture();
  const typed = typeEvaluationFixture();
  const { route: _canonicalRoute, ...previewBase } = f.preview;
  const typePreview = {
    ...previewBase,
    selection: {
      ...f.preview.selection,
      pipeline: "deterministic",
      limits: {
        ...f.preview.selection.limits,
        max_http_calls: 0,
        max_output_tokens: 0,
      },
    },
    type_route: {
      version: "deadline-type-pipeline-v1",
      mode: "deterministic",
      policy_version: "",
      policy: null,
      endpoint: "",
    },
    evaluator_version: "type-projection-v1",
    planned_http_calls: 0,
    planned_output_tokens: 0,
  };
  const typeFreezes = [],
    typeExecutions = [],
    typeReports = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const external = [],
    errors = [],
    freezes = [],
    executions = [],
    reports = [];
  let plan = null,
    run = null,
    emitted = false,
    withdrawn = false;
  const release = {
    id: f.ids.release,
    name: "Avaliação sintética",
    manifest_digest: f.preview.selection.expected_manifest_digest,
    frozen_at: f.plan.frozen_at,
    eligible: true,
    withdrawn: false,
    blockers: [],
    idempotent_replay: false,
    manifest: {
      schema_version: "intimation-release-v1",
      policy_version: "intimation-release-policy-v1",
      task_kind: "intimation_annotation",
      batch_id: f.ids.request,
      frame_id: f.ids.request,
      frame_digest: "a".repeat(64),
      protocol_id: f.ids.request,
      protocol_digest: "a".repeat(64),
      origin: "synthetic",
      purpose: "evaluation",
      included_count: 1,
      excluded_count: 0,
      split_counts: { train: 0, validation: 1, test: 0 },
      items: [],
    },
  };
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
    const absent = () =>
      reply({ kind: "ENTITY_NOT_FOUND", message: "Ausente" }, 404);
    const list = (data) =>
      reply({ data, page: { next_cursor: null, limit: 20 } });
    if (method === "OPTIONS") return route.fulfill({ headers, status: 204 });
    if (method === "GET" && p.endsWith(`/dataset-releases/${f.ids.release}`))
      return reply({ data: release });
    if (method === "GET" && p.endsWith("/publication-jobs"))
      return reply({ data: [] });
    if (method === "GET" && p.endsWith("/downloads")) return list([]);
    if (method === "GET" && p.endsWith("/evaluation-plans"))
      return list(
        plan
          ? [
              {
                id: plan.id,
                release_id: release.id,
                split: plan.preview.selection.split,
                ...(plan.preview.selection.pipeline
                  ? { pipeline: plan.preview.selection.pipeline }
                  : {}),
                case_count: 1,
                route_digest: plan.preview.route_digest,
                definition_digest: plan.definition_digest,
                frozen_at: plan.frozen_at,
              },
            ]
          : [],
      );
    if (method === "POST" && p.endsWith("/evaluation-plan-preview")) {
      const expected = req.postDataJSON().pipeline ? typePreview : f.preview;
      assert.deepEqual(req.postDataJSON(), expected.selection);
      return reply({ data: expected });
    }
    if (method === "POST" && p.endsWith("/evaluation-plans")) {
      if (req.postDataJSON().selection.pipeline) {
        const body = req.postDataJSON();
        typeFreezes.push(body);
        assert.deepEqual(body.selection, typePreview.selection);
        plan = {
          ...f.plan,
          preview: typePreview,
          request_id: body.request_id,
          execution_available: true,
        };
        return reply({ data: plan });
      }
      freezes.push(req.postDataJSON());
      plan = { ...f.plan, request_id: freezes[0].request_id };
      if (freezes.length === 1) return route.abort("failed");
      assert.deepEqual(freezes[1], freezes[0]);
      return reply({ data: { ...plan, idempotent_replay: true } });
    }
    if (method === "GET" && p.endsWith(`/evaluation-plans/${f.ids.plan}`))
      return reply({
        data: {
          ...plan,
          eligible: !withdrawn,
          blockers: withdrawn ? ["release_withdrawn"] : [],
        },
      });
    if (p.endsWith("/run")) {
      if (method === "POST") {
        if (plan.preview.selection.pipeline) {
          const body = req.postDataJSON();
          typeExecutions.push(body);
          assert.equal(body.confirmed, true);
          run = {
            ...f.run,
            state: "queued",
            failure_code: null,
            finished_at: null,
            request_id: body.request_id,
            case_counts: { queued: 1 },
            reserved_http_calls: 0,
            reserved_output_tokens: 0,
            report_available: true,
            telemetry: {
              ...f.run.telemetry,
              known_cost_cases: 1,
              unknown_cost_cases: 0,
              observed_cost_usd: "0",
              total_cost_usd: "0",
              known_call_cases: 1,
              unknown_call_cases: 0,
              observed_http_calls: 0,
            },
          };
          return reply({ data: run });
        }
        executions.push(req.postDataJSON());
        run = {
          ...f.run,
          state: "queued",
          finished_at: null,
          request_id: executions[0].request_id,
        };
        if (executions.length === 1) return route.abort("failed");
        assert.deepEqual(executions[1], executions[0]);
      }
      return run ? reply({ data: run }) : absent();
    }
    if (p.endsWith("/report")) {
      if (method === "POST" && plan.preview.selection.pipeline) {
        const body = req.postDataJSON();
        typeReports.push(body);
        assert.equal(body.confirmed_exposure, true);
        emitted = true;
        return reply({
          data: { ...typed.delivery, request_id: body.request_id },
        });
      }
      if (method === "POST") {
        reports.push(req.postDataJSON());
        emitted = true;
        if (reports.length === 1) return route.abort("failed");
        if (reports.length === 2) assert.deepEqual(reports[0], reports[1]);
        return reply({
          data: { ...f.delivery, request_id: reports.at(-1).request_id },
        });
      }
      if (!emitted) return absent();
      return reply({
        data: {
          id: f.ids.report,
          run_id: f.ids.run,
          plan_id: f.ids.plan,
          definition_digest: f.plan.definition_digest,
          digest: f.delivery.digest,
          evaluator_version: plan.preview.selection.pipeline
            ? "type-projection-v1"
            : "intimation-dimensions-v1",
          case_count: 1,
          generated_at: f.plan.frozen_at,
          eligible: !withdrawn,
          blockers: withdrawn ? ["release_withdrawn"] : [],
        },
      });
    }
    throw new Error(`Unexpected evaluation fixture request: ${method} ${p}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:3000/backoffice/releases/${f.ids.release}`);
  await page
    .getByRole("link", {
      name: "Preparar e acompanhar avaliações deste dataset",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Avaliar intimações", exact: true }),
  ).toBeVisible();
  assert.equal(executions.length, 0);
  await page.getByLabel("Limite de casos", { exact: true }).fill("1");
  await page.getByLabel("Limite de chamadas de IA", { exact: true }).fill("1");
  await page
    .getByLabel("Limite total de tokens de saída", { exact: true })
    .fill("100");
  await page
    .getByRole("button", { name: "Conferir plano sem executar IA" })
    .click();
  await page
    .getByLabel("Conferi o conjunto, o modelo e os limites deste plano.")
    .check();
  await page.getByLabel("Limite de casos", { exact: true }).fill("2");
  await expect(
    page.getByRole("button", { name: "Congelar plano" }),
  ).toHaveCount(0);
  await page.getByLabel("Limite de casos", { exact: true }).fill("1");
  await expect(
    page.getByLabel("Conferi o conjunto, o modelo e os limites deste plano."),
  ).not.toBeChecked();
  await page
    .getByLabel("Conferi o conjunto, o modelo e os limites deste plano.")
    .check();
  await page.getByRole("button", { name: "Congelar plano" }).click();
  await page
    .getByRole("button", { name: "Recuperar criação do plano" })
    .click();
  await page.getByRole("link", { name: "Conferir plano congelado" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar execução de avaliação" }),
  ).toBeDisabled();
  assert.equal(executions.length, 0);
  await page
    .getByLabel("Autorizo esta execução de IA com os limites congelados.")
    .check();
  await page
    .getByRole("button", { name: "Iniciar execução de avaliação" })
    .click();
  await page
    .getByRole("button", { name: "Recuperar ação da avaliação" })
    .click();
  await expect(page.getByText("Na fila", { exact: true })).toBeVisible();
  assert.equal(executions.length, 2);
  run = { ...f.run, request_id: executions[0].request_id };
  await page.getByRole("button", { name: "Atualizar avaliação" }).click();
  await expect(
    page.getByRole("heading", { name: "3. Abrir relatório" }),
  ).toBeVisible();
  assert.equal(reports.length, 0);
  await page
    .getByLabel("Confirmo a exposição aos resultados e a emissão auditada.")
    .check();
  await page.getByRole("button", { name: "Gerar e abrir relatório" }).click();
  await page
    .getByRole("button", { name: "Recuperar ação da avaliação" })
    .click();
  await expect(
    page.getByRole("region", { name: "Relatório emitido" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Relatório emitido" })
      .getByText("Desconhecido", { exact: true })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "evaluation-report-desktop.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "3. Abrir relatório" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Relatório emitido" }),
  ).toHaveCount(0);
  assert.equal(reports.length, 2);
  await page
    .getByLabel("Confirmo a exposição aos resultados e a emissão auditada.")
    .check();
  await page
    .getByRole("button", { name: "Abrir relatório com nova emissão" })
    .click();
  await expect(
    page.getByRole("region", { name: "Relatório emitido" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "evaluation-report-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  withdrawn = true;
  await page.getByRole("button", { name: "Atualizar avaliação" }).click();
  await expect(
    page.getByText("Emissão indisponível:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Relatório emitido" }),
  ).toHaveCount(0);
  assert.equal(reports.length, 3);
  assert.equal(executions.length, 2);
  plan = null;
  run = null;
  emitted = false;
  withdrawn = false;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `http://127.0.0.1:3000/backoffice/releases/${f.ids.release}/evaluations`,
  );
  await page
    .getByLabel("Avaliação", { exact: true })
    .selectOption("deterministic");
  await page
    .getByLabel("Limite de casos", { exact: true })
    .fill(String(typePreview.selection.limits.max_cases));
  await page.getByLabel("Limite de chamadas de IA", { exact: true }).fill("0");
  await page
    .getByLabel("Limite total de tokens de saída", { exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Conferir plano sem executar IA" })
    .click();
  await expect(
    page.getByText("Sem modelo de IA", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Conferi o conjunto, o modelo e os limites deste plano.")
    .check();
  await page.getByLabel("Avaliação", { exact: true }).selectOption("current");
  await expect(
    page.getByRole("button", { name: "Congelar plano", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Avaliação", { exact: true })
    .selectOption("deterministic");
  await page
    .getByRole("button", { name: "Conferir plano sem executar IA" })
    .click();
  await page
    .getByLabel("Conferi o conjunto, o modelo e os limites deste plano.")
    .check();
  await page
    .getByRole("button", { name: "Congelar plano", exact: true })
    .click();
  await page.getByRole("link", { name: "Conferir plano congelado" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar execução de avaliação" }),
  ).toBeDisabled();
  assert.equal(typeExecutions.length, 0);
  await page.reload();
  await expect(
    page.getByText("Sem modelo de IA", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Confirmo a execução local deste plano."),
  ).not.toBeChecked();
  assert.equal(typeExecutions.length, 0);
  await page.getByLabel("Confirmo a execução local deste plano.").check();
  await page
    .getByRole("button", { name: "Iniciar execução de avaliação" })
    .click();
  await expect(page.getByText("Na fila", { exact: true })).toBeVisible();
  run = {
    ...run,
    state: "completed",
    finished_at: f.run.finished_at,
    case_counts: { completed: 1 },
  };
  await page.getByRole("button", { name: "Atualizar avaliação" }).click();
  await expect(
    page.getByRole("heading", { name: "3. Abrir relatório" }),
  ).toBeVisible();
  assert.equal(typeReports.length, 0);
  await expect(
    page.getByText("Reservadas: 0 chamadas · 0 tokens de saída"),
  ).toBeVisible();
  await page
    .getByLabel("Confirmo a exposição aos resultados e a emissão auditada.")
    .check();
  await page.getByRole("button", { name: "Gerar e abrir relatório" }).click();
  await expect(
    page.getByRole("heading", { name: "Relatório de tipo do ato" }),
  ).toBeVisible();
  await expect(
    page.getByText("Esta avaliação mede somente a projeção de tipo do ato.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "evaluation-type-report-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Abrir relatório com nova emissão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Relatório emitido" }),
  ).toHaveCount(0);
  assert.equal(typeReports.length, 1);
  assert.equal(typeFreezes.length, 1);
  assert.equal(typeExecutions.length, 1);
  assert.equal(reports.length, 3);
  assert.equal(
    executions.length,
    2,
    "TYPE planning must never enqueue canonical inference",
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
  return {
    typePlanFrozenWithoutExecution: true,
    typeLocalRunRequiresConfirmation: true,
    typeLocalRunReservesZeroCalls: true,
    typeReportHasOwnScopeAndRequiresAuditedEmission: true,
    pipelineChangeInvalidatesConfirmation: true,
    realBackend: false,
    realClerk: false,
    paidProviderCalls: 0,
    exactFreezeRecovery: true,
    exactRunRecovery: true,
    exactReportRecovery: true,
    noAutomaticExecution: true,
    reloadRequiresAuditedEmission: true,
    withdrawalHidesReport: true,
    externalRequests: 0,
    pageErrors: 0,
  };
}
