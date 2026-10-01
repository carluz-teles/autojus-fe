import assert from "node:assert/strict";
import path from "node:path";

export async function preparationBrowserChecks(
  browser,
  expect,
  annotationFixture,
  output,
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
  });
  const page = await context.newPage(),
    base = annotationFixture();
  const writes = [],
    external = [],
    errors = [],
    receipts = new Map();
  let protocol = null,
    batch = null;
  const assistedID = "11111111-1111-4111-8111-111111111111";
  const inferenceRoute = {
    enabled: true,
    route: {
      task: "curation.annotate_intimation",
      model: "synthetic/model",
      prompt_version: "intimation-inference-v1",
      max_tokens: 4000,
    },
    digest: "e".repeat(64),
    max_http_calls: 1,
  };
  const inferenceJobs = [];
  let inferenceReads = 0;
  const frame = {
    id: "synthetic-frame",
    lineage_id: "lineage",
    manifest_digest: "f".repeat(64),
    frozen_at: new Date().toISOString(),
    valid: true,
    invalidations: [],
    plan: {
      selected_count: 2,
      selected_groups: 2,
      deficit: 98,
      split_counts: { train: 1, validation: 0, test: 1 },
      population: [
        { selected: true, origin: "synthetic" },
        { selected: true, origin: "synthetic" },
      ],
    },
  };
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  const pageData = (data) => ({ data, page: { next_cursor: null, limit: 20 } });
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
    if (request.method() === "OPTIONS") return reply({});
    if (request.method() === "GET") {
      if (url.pathname.endsWith("/inference-route"))
        return reply({ data: inferenceRoute });
      if (url.pathname.endsWith("/inference-jobs")) {
        inferenceReads++;
        assert.equal(url.pathname.includes(assistedID), true);
        return reply({ data: inferenceJobs });
      }
      if (url.pathname.endsWith("/annotation-act-catalog"))
        return reply({
          data: [
            { key: "ciencia", label: "Ciência" },
            { key: "manifestacao_generica", label: "Manifestação" },
          ],
        });
      if (url.pathname.endsWith("/annotation-protocols"))
        return reply(pageData(protocol ? [protocol] : []));
      if (url.pathname.endsWith("/annotation-protocols/protocol"))
        return reply({ data: protocol });
      if (url.pathname.endsWith("/annotation-batches"))
        return reply(pageData(batch ? [batch] : []));
      if (url.pathname.endsWith("/annotation-batches/batch"))
        return reply({ data: batch });
      if (url.pathname.endsWith("/sampling"))
        return reply(
          pageData([
            { ...frame, lineage_key: "synthetic:pilot", selected_count: 2 },
          ]),
        );
      if (url.pathname.endsWith("/sampling/synthetic-frame"))
        return reply({ data: frame });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      writes.push({ path: url.pathname, body });
      if (receipts.has(body.request_id))
        return reply({ data: receipts.get(body.request_id) });
      if (url.pathname.endsWith("/annotation-protocols")) {
        protocol = {
          id: "protocol",
          key: body.key,
          revision: 1,
          previous_revision_id: null,
          origin: body.origin,
          matter_key: body.matter_key,
          digest: "d".repeat(64),
          author_person_id: "synthetic-person",
          recorded_at: new Date().toISOString(),
          idempotent_replay: false,
          definition: {
            ...base.protocol,
            contract: {
              ...base.protocol.contract,
              act_types: body.act_types,
              legal_rules: body.legal_rules,
            },
            rule_sources: body.rule_sources,
            rubric: body.rubric,
            review_policy: body.review_policy,
            review_reference: body.review_reference,
            reviewed_at: body.reviewed_at,
            reason: body.reason,
          },
        };
        receipts.set(body.request_id, protocol);
        return route.abort("failed");
      }
      if (url.pathname.endsWith("/annotation-batches")) {
        assert.equal(body.manifest_digest, frame.manifest_digest);
        assert.equal(body.protocol_id, protocol.id);
        assert.deepEqual(Object.keys(body).sort(), [
          "frame_id",
          "manifest_digest",
          "protocol_id",
          "request_id",
        ]);
        batch = {
          id: "batch",
          frame_id: frame.id,
          protocol_id: protocol.id,
          task_kind: base.protocol.task_kind,
          task_count: 2,
          valid: true,
          recorded_at: new Date().toISOString(),
          idempotent_replay: false,
          tasks: ["assisted", "blind"].map((mode, index) => ({
            id:
              index === 0 ? assistedID : "33333333-3333-4333-8333-333333333333",
            source_link_id: `source-${index}`,
            case_version_id: `version-${index}`,
            snapshot_digest: base.snapshot_digest,
            source_digest: "s",
            sanitized_digest: "s",
            mode,
            split: mode === "blind" ? "test" : "train",
          })),
        };
        receipts.set(body.request_id, batch);
        return route.abort("failed");
      }
      if (url.pathname.endsWith("/snapshot-predictions")) {
        assert.equal(body.engine_version, "snapshot-rules-v1");
        assert.equal(body.expected_protocol_digest, protocol.digest);
        assert.equal(
          url.pathname.includes(assistedID),
          true,
          "Blind tasks cannot prepare a prediction",
        );
        return reply(
          {
            data: {
              id: "local-attempt",
              task_id: assistedID,
              attempt: 1,
              state: "completed",
              error_code: null,
              engine_version: body.engine_version,
              http_calls: 0,
              recorded_at: new Date().toISOString(),
              idempotent_replay: false,
            },
          },
          201,
        );
      }
      if (url.pathname.endsWith("/inference-jobs")) {
        assert.equal(url.pathname.includes(assistedID), true);
        assert.equal(body.confirmed, true);
        assert.equal(body.expected_route_digest, inferenceRoute.digest);
        const prior = inferenceJobs[0];
        assert.equal(body.expected_previous_job_id, prior?.id ?? null);
        assert.equal(
          body.acknowledged_uncertain_job_id,
          prior?.state === "uncertain" ? prior.id : null,
        );
        const job = {
          id: prior
            ? "55555555-5555-4555-8555-555555555555"
            : "44444444-4444-4444-8444-444444444444",
          request_id: body.request_id,
          task_id: assistedID,
          attempt: prior ? 3 : 2,
          state: prior ? "completed" : "queued",
          failure_code: null,
          prediction_id: prior ? "55555555-5555-4555-8555-555555555555" : null,
          route_digest: inferenceRoute.digest,
          route: inferenceRoute.route,
          requested_at: new Date().toISOString(),
          reserved_at: null,
          finished_at: null,
          http_calls_reserved: prior ? 1 : 0,
          cost_usd: prior ? "0.0001" : "0",
          late_result: false,
          idempotent_replay: false,
        };
        inferenceJobs.unshift(job);
        receipts.set(body.request_id, job);
        return prior ? reply({ data: job }, 202) : route.abort("failed");
      }
    }
    throw new Error(
      `Unexpected preparation endpoint: ${request.method()} ${url.pathname}`,
    );
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3000/backoffice/preparation");
  await page
    .getByRole("link", { name: "Criar protocolo", exact: true })
    .click();
  await page
    .getByLabel("Identificador da linhagem")
    .fill("synthetic:ui-protocol");
  await page.getByLabel("Origem dos casos").selectOption("synthetic");
  await page.getByLabel("Chave da matéria").fill("civil");
  await page.getByRole("checkbox", { name: /Ciência/ }).check();
  await page
    .getByLabel("Orientação de revisão")
    .fill("Rubrica exclusivamente fictícia para QA.");
  await page.getByRole("button", { name: "Adicionar regra revisada" }).click();
  await page.getByLabel("Identificador da regra").fill("synthetic:rule");
  await page.getByLabel("Quantidade", { exact: true }).fill("15");
  await page
    .getByLabel("Evento inicial", { exact: true })
    .fill("synthetic:publication");
  await page
    .getByLabel("Regra de início da contagem")
    .fill("synthetic:next-day");
  await page.getByLabel("Citação jurídica").fill("Norma fictícia para QA");
  await page
    .getByLabel("Referência da fonte conferida")
    .fill("synthetic:source");
  await page
    .getByLabel("Nota de revisão da regra")
    .fill("Não constitui revisão jurídica real.");
  await page
    .getByLabel("Referência do registro de revisão")
    .fill("synthetic:review");
  await page
    .getByLabel("Data e hora da revisão, com fuso")
    .fill("2026-09-29T12:00:00-03:00");
  await page
    .getByLabel("Motivo desta revisão do protocolo")
    .fill("Teste sintético da interface.");
  const confirmed = page.getByRole("checkbox", {
    name: "Conferi catálogo, rubrica, regras, fontes e os registros de revisão informados.",
  });
  await confirmed.check();
  await page
    .getByLabel("Motivo desta revisão do protocolo")
    .fill("Teste sintético, sem dados jurídicos reais.");
  await expect(confirmed).not.toBeChecked();
  await confirmed.check();
  await page.screenshot({
    path: path.join(output, "protocol-form.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Congelar revisão do protocolo" })
    .click();
  await page
    .getByRole("button", { name: "Recuperar protocolo enviado" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Protocolo congelado · revisão 1" }),
  ).toBeVisible();
  assert.deepEqual(writes[0], writes[1]);
  assert.equal(
    protocol.definition.rule_sources["synthetic:rule"].citation,
    "Norma fictícia para QA",
  );
  await page
    .getByRole("link", { name: "Consultar protocolo registrado" })
    .click();
  await page
    .getByRole("link", { name: "Preparar nova revisão deste protocolo" })
    .click();
  await expect(
    page.getByLabel("Referência do registro de revisão"),
  ).toHaveValue("");
  await expect(page.getByLabel("Data e hora da revisão, com fuso")).toHaveValue(
    "",
  );
  await page.getByRole("link", { name: "Voltar à preparação" }).click();
  await page.getByLabel("Amostra congelada").selectOption(frame.id);
  await page
    .getByLabel("Revisão do protocolo", { exact: true })
    .selectOption(protocol.id);
  await page
    .getByRole("checkbox", {
      name: "Conferi a amostra e esta revisão do protocolo para preparar o lote completo.",
    })
    .check();
  await page
    .getByRole("button", { name: "Preparar lote completo", exact: true })
    .click();
  await page.getByRole("button", { name: "Recuperar lote enviado" }).click();
  assert.deepEqual(writes[2], writes[3]);
  await page
    .getByRole("link", { name: "Consultar e preparar tarefas do lote" })
    .click();
  await page.getByRole("button", { name: "Preparar sugestão local" }).click();
  await expect(
    page.getByText(
      "Tentativa 1: preparação concluída. Nenhuma chamada externa.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Controle cego: sem preparação de sugestão."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir fila de revisão deste lote" }),
  ).toHaveAttribute("href", "/backoffice/curation?batch=batch");
  await expect(
    page.getByRole("button", { name: "Conferir inferência de IA" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Conferir inferência de IA" }).click();
  const panel = page.getByRole("region", { name: "Inferência de IA" });
  const submitInference = panel.getByRole("button", {
    name: "Solicitar hipótese de IA",
  });
  await expect(submitInference).toBeEnabled();
  await submitInference.click();
  await expect(panel.getByRole("alert")).toContainText("confirme o consumo");
  assert.equal(inferenceJobs.length, 0);
  const consent = panel.getByRole("checkbox", {
    name: "Conferi o modelo e autorizo o consumo desta nova tentativa.",
  });
  await consent.check();
  await submitInference.click();
  await expect(
    panel.getByRole("button", { name: "Recuperar solicitação enviada" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Atualizar inferência" }).click();
  await expect(panel.getByRole("status")).toContainText("Na fila");
  await panel
    .getByRole("button", { name: "Recuperar solicitação enviada" })
    .click();
  const inferenceWrites = () =>
    writes.filter((w) => w.path.endsWith("/inference-jobs"));
  await expect.poll(() => inferenceWrites().length).toBe(2);
  assert.deepEqual(inferenceWrites()[0], inferenceWrites()[1]);
  inferenceJobs[0].state = "uncertain";
  inferenceJobs[0].failure_code = "worker_expired";
  inferenceJobs[0].http_calls_reserved = null;
  inferenceJobs[0].cost_usd = null;
  await panel.getByRole("button", { name: "Atualizar inferência" }).click();
  await expect(panel.getByRole("status")).toContainText("Resultado incerto");
  await expect(consent).not.toBeChecked();
  await consent.check();
  await submitInference.click();
  assert.equal(inferenceWrites().length, 2);
  await expect(panel.getByRole("alert")).toContainText("pode ter consumido");
  await panel
    .getByRole("checkbox", { name: /Entendo que a tentativa anterior/ })
    .check();
  await page.screenshot({
    path: path.join(output, "inference-confirmation.png"),
    fullPage: true,
  });
  await submitInference.click();
  await expect(panel.getByRole("status")).toContainText("Hipótese disponível");
  assert.equal(inferenceWrites().length, 3);
  assert.notEqual(
    inferenceWrites()[0].body.request_id,
    inferenceWrites()[2].body.request_id,
  );
  const terminalReads = inferenceReads;
  await page.waitForTimeout(2500);
  assert.equal(
    inferenceReads,
    terminalReads,
    "Polling stops at terminal state",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(output, "prepared-batch-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Preparation must not overflow the mobile viewport",
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
  return {
    protocolRequests: 2,
    batchRequests: 2,
    localPredictionRequests: 1,
    inferenceRequests: 3,
    inferenceJobs: 2,
    paidProviderCalls: 0,
    externalRequests: 0,
    pageErrors: 0,
  };
}
