import assert from "node:assert/strict";
import path from "node:path";

export async function ragBrowserChecks(
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
    base = annotationFixture("assisted");
  const id = "11111111-1111-4111-8111-111111111111",
    batchID = "22222222-2222-4222-8222-222222222222",
    taskID = "33333333-3333-4333-8333-333333333333",
    indexID = "44444444-4444-4444-8444-444444444444",
    queryID = "55555555-5555-4555-8555-555555555555",
    goldID = "66666666-6666-4666-8666-666666666666";
  const contract = {
    corpus: "intimation-examples-v1",
    endpoint: "https://ai.mongodb.com/v1/embeddings",
    model: "voyage-4",
    dimension: 1024,
    normalization: "identity-utf8-v1",
    chunking: "utf8-4096-v1",
    query_aggregation: "mean-normalized-v1",
  };
  const release = {
    id,
    name: "Exemplos sintéticos revisados",
    manifest_digest: "a".repeat(64),
    frozen_at: "2026-10-01T00:00:00Z",
    eligible: true,
    withdrawn: false,
    blockers: [],
    idempotent_replay: false,
    manifest: {
      schema_version: "intimation-release-v1",
      policy_version: "intimation-release-policy-v1",
      task_kind: "intimation_annotation",
      batch_id: batchID,
      frame_id: "frame",
      frame_digest: "b".repeat(64),
      protocol_id: "protocol",
      protocol_digest: "b".repeat(64),
      origin: "synthetic",
      purpose: "rag",
      included_count: 1,
      excluded_count: 0,
      split_counts: { train: 1, validation: 0, test: 0 },
      items: [],
    },
  };
  const task = {
    id: taskID,
    source_link_id: "source",
    case_version_id: "version",
    snapshot_digest: "a".repeat(64),
    source_digest: "a".repeat(64),
    sanitized_digest: "a".repeat(64),
    split: "train",
    mode: "assisted",
  };
  const protocol = {
    id: "protocol",
    key: "synthetic",
    revision: 1,
    origin: "synthetic",
    matter_key: "civel",
    digest: "b".repeat(64),
    recorded_at: "2026-10-01T00:00:00Z",
    definition: base.protocol,
  };
  const batch = {
    id: batchID,
    frame_id: "frame",
    protocol_id: "protocol",
    task_kind: base.protocol.task_kind,
    task_count: 1,
    valid: true,
    recorded_at: "2026-10-01T00:00:00Z",
    tasks: [task],
    idempotent_replay: false,
  };
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
  let index = null,
    query = null,
    job = null,
    indexLost = true,
    queryLost = true,
    jobLost = true;
  const writes = [],
    external = [],
    errors = [];
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  const paged = (data) => ({ data, page: { next_cursor: null, limit: 20 } });
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      p = url.pathname;
    if (url.origin === "http://127.0.0.1:3000") return route.continue();
    if (url.origin !== "http://127.0.0.1:18080") {
      external.push(url.origin);
      return route.abort();
    }
    const reply = (data, status = 200) =>
      route.fulfill({ headers, status, json: data });
    if (request.method() === "OPTIONS") return reply({});
    if (request.method() === "GET") {
      if (p.endsWith("/rag-index"))
        return reply({
          data: {
            enabled: true,
            contract,
            indexes: index ? [{ ...index, eligible: release.eligible }] : [],
          },
        });
      if (p.endsWith("/dataset-releases/" + id))
        return reply({ data: release });
      if (p.endsWith("/dataset-releases"))
        return reply(paged([{ ...release, purpose: "rag" }]));
      if (p.endsWith("/publication-jobs")) return reply({ data: [] });
      if (p.endsWith("/downloads")) return reply(paged([]));
      if (p.endsWith("/annotation-batches/" + batchID))
        return reply({ data: batch });
      if (p.endsWith("/annotation-protocols/protocol"))
        return reply({ data: protocol });
      if (p.endsWith("/inference-route"))
        return reply({ data: inferenceRoute });
      if (p.endsWith("/inference-jobs"))
        return reply({ data: job ? [job] : [] });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      writes.push({ path: p, body });
      if (p.endsWith("/rag-index")) {
        index ??= {
          id: indexID,
          release_id: id,
          manifest_digest: release.manifest_digest,
          contract,
          state: "ready",
          embedding_state: "ready",
          chunk_count: 1,
          http_calls_reserved: 1,
          total_tokens: 12,
          eligible: true,
          replayed: false,
        };
        if (indexLost) {
          indexLost = false;
          return route.abort("connectionreset");
        }
        return reply({ data: { ...index, replayed: true } });
      }
      if (p.endsWith("/queries")) {
        const text = base.snapshot.facts.text;
        query ??= {
          id: queryID,
          request_id: body.request_id,
          task_id: taskID,
          snapshot_digest: task.snapshot_digest,
          index_id: indexID,
          release_id: id,
          state: "ready",
          model: "voyage-4",
          http_calls_reserved: 1,
          total_tokens: 8,
          replayed: false,
          matches: [
            {
              gold_id: goldID,
              ordinal: 0,
              score: 0.87,
              text,
              start_byte: 0,
              end_byte: Buffer.byteLength(text),
              example: {
                id: goldID,
                split: "train",
                origin: "synthetic",
                gold_digest: "c".repeat(64),
                group_digest: "d".repeat(64),
                input: { facts: base.snapshot.facts },
                annotation: {
                  schema_version: "intimation-label-v1",
                  catalog_version: "synthetic:catalog",
                  normalization_version: "identity-utf8-v1",
                  snapshot_digest: "a".repeat(64),
                  label: {
                    answerability: "insufficient",
                    missing_context: ["recipient_role"],
                    acts: [],
                    abstention_reason:
                      "Destinatário não identificado no exemplo sintético.",
                  },
                },
              },
            },
          ],
        };
        if (queryLost) {
          queryLost = false;
          return route.abort("connectionreset");
        }
        assert.equal(body.request_id, query.request_id);
        return reply({ data: { ...query, replayed: true } });
      }
      if (p.endsWith("/inference-jobs")) {
        assert.equal(body.rag_query_id, queryID);
        job ??= {
          id: "77777777-7777-4777-8777-777777777777",
          request_id: body.request_id,
          task_id: taskID,
          attempt: 1,
          state: "completed",
          failure_code: null,
          prediction_id: "77777777-7777-4777-8777-777777777777",
          route_digest: inferenceRoute.digest,
          route: inferenceRoute.route,
          requested_at: "2026-10-01T00:00:00Z",
          reserved_at: "2026-10-01T00:00:00Z",
          finished_at: "2026-10-01T00:00:01Z",
          http_calls_reserved: 1,
          cost_usd: "0",
          late_result: false,
          idempotent_replay: false,
          rag: {
            query_id: queryID,
            index_id: indexID,
            release_id: id,
            result_digest: "f".repeat(64),
            model: "voyage-4",
            example_count: 1,
          },
        };
        if (jobLost) {
          jobLost = false;
          return route.abort("connectionreset");
        }
        assert.equal(body.request_id, job.request_id);
        return reply({ data: { ...job, idempotent_replay: true } });
      }
    }
    return reply(
      { kind: "NOT_FOUND", message: `Unhandled synthetic route ${p}` },
      404,
    );
  });
  try {
    await page.goto(`http://127.0.0.1:3000/backoffice/releases/${id}`);
    await expect(
      page.getByRole("heading", { name: "Exemplos para as sugestões" }),
    ).toBeVisible();
    assert.equal(writes.length, 0);
    await page
      .getByRole("button", { name: "Indexar exemplos aprovados" })
      .click();
    await expect(
      page.getByText("Confirme o dataset e o consumo limitado de embeddings."),
    ).toBeVisible();
    assert.equal(writes.length, 0);
    await page
      .getByLabel(
        "Conferi o dataset e autorizo esta tentativa limitada de embeddings.",
      )
      .check();
    await page
      .getByRole("button", { name: "Indexar exemplos aprovados" })
      .click();
    await page
      .getByRole("button", { name: "Recuperar indexação enviada" })
      .click();
    await expect(page.getByText("Índice pronto · 1 fragmentos")).toBeVisible();
    assert.deepEqual(writes[0], writes[1]);
    await page.goto(
      `http://127.0.0.1:3000/backoffice/preparation/batches/${batchID}`,
    );
    await page
      .getByRole("button", { name: "Conferir inferência de IA" })
      .click();
    await page.getByLabel("Dataset de exemplos").selectOption(id);
    await expect(
      page.getByRole("button", { name: "Buscar exemplos semelhantes" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Solicitar hipótese de IA" }),
    ).toBeDisabled();
    await page
      .getByLabel(
        "Confirmo a busca de até três exemplos, com limite de 128 KiB, e a exposição aos gabaritos recuperados.",
      )
      .check();
    await page
      .getByRole("button", { name: "Buscar exemplos semelhantes" })
      .click();
    await page.getByRole("button", { name: "Recuperar busca enviada" }).click();
    await expect(page.getByText(/1 exemplo\(s\) serão usados/)).toBeVisible();
    await page
      .locator("summary")
      .filter({ hasText: "Exemplo revisado" })
      .click();
    await expect(
      page.getByText("Destinatário não identificado no exemplo sintético."),
    ).toBeVisible();
    await page
      .getByLabel("Conferi o modelo e autorizo o consumo desta nova tentativa.")
      .check();
    await page
      .getByRole("button", { name: "Solicitar hipótese de IA" })
      .click();
    await page
      .getByRole("button", { name: "Recuperar solicitação enviada" })
      .click();
    await expect(page.getByText(/Exemplos revisados usados: 1/)).toBeVisible();
    for (const suffix of ["/rag-index", "/queries", "/inference-jobs"]) {
      const w = writes.filter((w) => w.path.endsWith(suffix));
      assert.equal(w.length, 2);
      assert.deepEqual(w[0], w[1]);
    }
    await page.screenshot({
      path: path.join(output, "rag-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: path.join(output, "rag-mobile.png"),
      fullPage: true,
    });
    release.eligible = false;
    await page.getByRole("button", { name: "Atualizar datasets" }).click();
    await expect(
      page.getByText("Destinatário não identificado no exemplo sintético."),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Solicitar hipótese de IA" }),
    ).toBeDisabled();
    const count = writes.length;
    await page.reload();
    await page
      .getByRole("button", { name: "Conferir inferência de IA" })
      .click();
    await expect(page.getByLabel("Dataset de exemplos")).toHaveValue("");
    assert.equal(writes.length, count);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    return {
      writes: writes.length,
      logicalCommands: 3,
      recoveredSameCommands: true,
      revokedExamplesHidden: true,
      mobileNoOverflow: true,
      external,
      pageErrors: errors,
    };
  } finally {
    await context.close();
  }
}
