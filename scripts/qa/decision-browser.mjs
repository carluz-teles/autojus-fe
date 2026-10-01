import assert from "node:assert/strict";
import path from "node:path";

export async function decisionBrowserChecks(
  browser,
  expect,
  annotationFixture,
  output,
) {
  const results = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const source = annotationFixture();
    const answer = {
      schema_version: source.protocol.contract.schema_version,
      catalog_version: source.protocol.contract.catalog_version,
      normalization_version: source.protocol.contract.normalization_version,
      snapshot_digest: source.snapshot_digest,
      label: {
        answerability: "insufficient",
        missing_context: ["Destinatário"],
        acts: [],
        abstention_reason: "Contexto exclusivamente sintético ausente.",
      },
    };
    const input = {
      task_id: "synthetic-task",
      snapshot: source.snapshot,
      snapshot_digest: source.snapshot_digest,
      protocol: source.protocol,
      group_source_ids: ["synthetic-source"],
      origin: "synthetic",
      split: "train",
      revision: 0,
      previous_decision_id: null,
      input_digest: "d".repeat(64),
      reviews: [
        {
          submission_id: "review-1",
          person_id: "synthetic-1",
          mode: "blind",
          digest: "c".repeat(64),
          qualified: true,
          grant_reference: null,
          independent: true,
          annotation: answer,
        },
      ],
      alerts: [],
      assessment: {
        policy_version: "annotation-decision-policy-v1",
        ready: true,
        required_reviews: 1,
        qualified_reviews: 1,
        independent_reviews: 1,
        critical: false,
        differences: [],
        blockers: [],
      },
      source_purposes: ["evaluation"],
    };
    const external = [],
      errors = [],
      writes = [];
    let opened = 0,
      drop = !mobile,
      receipt = null;
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
      if (request.method() === "OPTIONS") return reply({});
      if (url.pathname.endsWith("/annotation-decision-queue"))
        return reply({
          data: [
            {
              task_id: input.task_id,
              batch_id: "batch",
              mode: "assisted",
              split: "train",
              frame_valid: true,
              submitted_reviews: 1,
              critical_alerts: 0,
              latest_decision_id: receipt?.id ?? null,
            },
          ],
          page: { next_cursor: null, limit: 20 },
        });
      if (url.pathname.endsWith("/decision-input")) {
        opened++;
        return reply({ data: input });
      }
      if (url.pathname.endsWith("/critical-alerts")) {
        const body = request.postDataJSON();
        writes.push({ kind: "alert", body });
        const alert = {
          id: "alert-1",
          task_id: input.task_id,
          reason: body.reason,
          recorded_at: new Date().toISOString(),
          idempotent_replay: false,
        };
        input.alerts.push(alert);
        input.input_digest = "e".repeat(64);
        input.assessment = {
          ...input.assessment,
          ready: false,
          critical: true,
          required_reviews: 2,
          blockers: ["reviews_pending"],
        };
        return reply({ data: alert }, 201);
      }
      if (url.pathname.endsWith("/decisions") && request.method() === "POST") {
        const body = request.postDataJSON();
        writes.push({ kind: "decision", body });
        if (!receipt) {
          assert.equal(body.expected_input_digest, input.input_digest);
          assert.equal(body.expected_revision, input.revision);
          assert.deepEqual(
            body.submission_ids,
            input.reviews.map((r) => r.submission_id),
          );
          receipt = {
            ...body,
            id: "decision-1",
            task_id: input.task_id,
            revision: input.revision + 1,
            input_digest: input.input_digest,
            annotation_digest: "f".repeat(64),
            origin: "synthetic",
            quality: "adjudicated",
            purposes: ["evaluation"],
            assessment: input.assessment,
            evidence: { reviews: input.reviews, alerts: input.alerts },
            recorded_at: new Date().toISOString(),
            current: true,
            inputs_current: true,
            frame_valid: true,
            authority_current: true,
            idempotent_replay: false,
          };
        }
        if (drop) {
          drop = false;
          return route.abort("failed");
        }
        return reply({ data: receipt });
      }
      if (url.pathname.endsWith("/annotation-decisions/decision-1"))
        return reply({ data: receipt });
      throw new Error(
        `Unexpected synthetic decision endpoint: ${request.method()} ${url.pathname}`,
      );
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3000/backoffice/decisions", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("link", { name: "Abrir comparação" }),
    ).toBeVisible();
    assert.equal(opened, 0, "Queue must not prefetch peer answers");
    await page.getByRole("link", { name: "Abrir comparação" }).click();
    await expect(
      page.getByRole("heading", { name: "Comparar e decidir" }),
    ).toBeVisible();
    await expect(page.getByLabel("Resultado", { exact: true })).toBeVisible();
    assert.equal(opened, 1);
    await page
      .getByRole("button", {
        name: "Copiar revisão 1 para substituir os campos de correção",
      })
      .click();
    await page
      .getByLabel("Justificativa da decisão", { exact: true })
      .fill("Decisão sobre exemplo fictício para teste da interface.");
    if (!mobile) {
      await page
        .getByLabel("Resultado", { exact: true })
        .selectOption("corrected");
      await page
        .getByLabel("Quanto é possível determinar?")
        .selectOption("determinate");
      await page.getByLabel("Contexto que falta, um item por linha").fill("");
      await page.getByLabel("Por que o contexto é insuficiente?").fill("");
      await page
        .getByRole("button", { name: "Adicionar ato", exact: true })
        .click();
      await page
        .getByLabel("Tipo do ato", { exact: true })
        .selectOption("ciencia");
      await page.getByLabel("A quem se dirige?").selectOption("both");
      await page
        .getByLabel("O que o ato representa?")
        .selectOption("awareness");
      const text = page.getByLabel("Teor integral da intimação");
      await text.click();
      await text.press("ControlOrMeta+A");
      await page
        .getByRole("button", {
          name: "Usar trecho selecionado como evidência do ato 1",
        })
        .click();
      await page.getByLabel("Natureza do prazo").selectOption("none");
      await page
        .getByLabel("Justificativa sobre o prazo")
        .fill("Ciência sem prazo neste exemplo fictício.");
      await page
        .getByLabel("Motivo do alerta crítico")
        .fill("Conferir o trecho de ciência.");
      await page
        .getByRole("button", { name: "Registrar alerta crítico", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Registrar decisão jurídica",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Atualizar comparação", exact: true })
        .click();
      await expect(
        page.getByText("Faltam revisões qualificadas.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Conferi a comparação atual; manter minhas edições",
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Registrar decisão jurídica",
          exact: true,
        }),
      ).toBeDisabled();
      input.reviews.push({
        ...structuredClone(input.reviews[0]),
        submission_id: "review-2",
        person_id: "synthetic-2",
      });
      input.input_digest = "f".repeat(64);
      input.assessment = {
        ...input.assessment,
        ready: true,
        qualified_reviews: 2,
        independent_reviews: 2,
        blockers: [],
      };
      await page
        .getByRole("button", { name: "Atualizar comparação", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Revisão 2 · Cega" }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Conferi a comparação atual; manter minhas edições",
        })
        .click();
      await expect(page.getByLabel("Justificativa sobre o prazo")).toHaveValue(
        "Ciência sem prazo neste exemplo fictício.",
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(
        output,
        mobile ? "decision-mobile.png" : "decision-desktop.png",
      ),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    await page
      .getByRole("button", { name: "Registrar decisão jurídica", exact: true })
      .click();
    if (!mobile) {
      await page
        .getByRole("button", {
          name: "Recuperar exatamente o último envio",
          exact: true,
        })
        .click();
      const decisions = writes.filter((w) => w.kind === "decision");
      assert.equal(decisions.length, 2);
      assert.deepEqual(decisions[0], decisions[1]);
      assert.equal(receipt.annotation.label.acts[0].act_type, "ciencia");
    }
    await expect(
      page.getByRole("heading", { name: "Decisão registrada · revisão 1" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Voltar à fila de decisões", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Consultar decisão", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Histórico jurídico" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Decisão registrada · revisão 1" }),
    ).toBeVisible();
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    results.push({
      viewport: page.viewportSize(),
      outcome: receipt.outcome,
      decisionRequests: writes.filter((w) => w.kind === "decision").length,
      alerts: writes.filter((w) => w.kind === "alert").length,
      exposuresRequested: opened,
      externalRequests: 0,
      pageErrors: 0,
    });
    await context.close();
  }
  return results;
}
