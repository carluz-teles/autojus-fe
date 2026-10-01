import assert from "node:assert/strict";
import path from "node:path";

export async function feedbackBrowserChecks(browser, expect, output) {
  const reports = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 1000 },
      serviceWorkers: "block",
    });
    const page = await context.newPage(),
      commands = [],
      exposureRequests = [],
      observed = new Set(),
      errors = [],
      external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const resultA = "018f0bf8-6e67-7000-8000-000000000001",
      resultB = "018f0bf8-6e67-7000-8000-000000000002";
    const message = (id, content, extra = {}) => ({
      id,
      draft_id: "synthetic-draft",
      role: "assistant",
      content,
      citations: [],
      grounded: false,
      created_at: "2026-10-01T12:00:00Z",
      ...extra,
    });
    const messages = [
      message("legacy", "Resposta histórica sem recibo."),
      message("rule", "Orientação produzida por regra.", {
        ai_result_id: resultB,
        result_origin: "rule",
      }),
      message(
        "first",
        "Análise sintética da manifestação. Confira o prazo e o ato nos autos antes de prosseguir.",
        { ai_result_id: resultA, result_origin: "ai_with_rules" },
      ),
    ];
    const states = new Map(),
      receipts = new Map();
    let person = "person-a",
      org = "org-a",
      lost = false,
      revoked = false;
    const empty = (id) => ({
      result_id: id,
      dimension: "usefulness",
      revision: 0,
      status: "absent",
      helpful: null,
      updated_at: null,
    });
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin === "http://127.0.0.1:3000") return route.continue();
      if (url.origin !== "http://127.0.0.1:18080") {
        external.push(url.origin);
        return route.abort();
      }
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Cache-Control": "private, no-store",
      };
      const respond = (json, status = 200) =>
        route.fulfill({ status, headers, json });
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (url.pathname === "/v1/pecas/synthetic-draft/chat") {
        if (request.method() === "GET") return respond({ data: { messages } });
        const row = message(
          "second",
          "Segunda análise sintética, com avaliação independente.",
          { ai_result_id: resultB, result_origin: "ai" },
        );
        messages.push(row);
        return respond({ data: row });
      }
      const match = url.pathname.match(
        /^\/v1\/ai-results\/([^/]+)\/feedback(\/withdrawals|\/exposures)?$/,
      );
      if (!match) {
        external.push(url.pathname);
        return route.abort();
      }
      if (revoked)
        return respond(
          { kind: "AUTHORIZATION_ERROR", message: "Acesso revogado." },
          403,
        );
      const id = match[1],
        key = `${org}/${person}/${id}`;
      if (match[2] === "/exposures") {
        assert.equal(request.method(), "POST");
        assert.deepEqual(request.postDataJSON(), {});
        exposureRequests.push(key);
        observed.add(key);
        return route.fulfill({ status: 204, headers });
      }
      const current = states.get(key) ?? empty(id);
      if (request.method() === "GET") return respond({ data: current });
      const body = request.postDataJSON();
      commands.push({ method: request.method(), path: url.pathname, body });
      if (receipts.has(body.request_id))
        return respond({
          data: { ...receipts.get(body.request_id), replayed: true },
        });
      if (body.expected_revision !== current.revision)
        return respond(
          {
            kind: "CONFLICT",
            message: "Revision",
            details: { code: "revision_conflict" },
          },
          409,
        );
      const withdrawn = !!match[2];
      const state = {
        ...empty(id),
        ...(!withdrawn ? body : {}),
        status: withdrawn ? "withdrawn" : "active",
        helpful: withdrawn ? null : body.helpful,
        revision: current.revision + 1,
        updated_at: "2026-10-01T12:00:00Z",
        request_id: body.request_id,
        replayed: false,
      };
      states.set(key, state);
      receipts.set(body.request_id, state);
      if (lost) {
        lost = false;
        return route.abort("failed");
      }
      return respond({ data: state });
    });
    await page.goto("http://127.0.0.1:3000/qa-feedback");
    const ctas = page.getByRole("region", { name: "Esta resposta foi útil?" });
    await expect(ctas).toHaveCount(1);
    const first = ctas.first();
    await expect(
      first.getByRole("button", { name: "Não", exact: true }),
    ).toBeEnabled();
    assert.equal(commands.length, 0);
    await expect.poll(() => exposureRequests.length).toBe(1);
    assert.equal(observed.size, 1);
    assert.equal(states.size, 0);
    await first.getByRole("button", { name: "Não", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(
      first.getByRole("button", { name: "Não", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await first
      .getByRole("button", { name: "Adicionar ou editar comentário" })
      .click();
    await first
      .getByLabel("Comentário (opcional)", { exact: true })
      .fill("<script>comentário sintético</script>");
    await first
      .getByLabel("Como você corrigiria? (opcional)")
      .fill("Conferir o destinatário antes de classificar.");
    lost = true;
    await first.getByRole("button", { name: "Salvar comentário" }).click();
    await expect(
      first.getByRole("button", { name: "Tentar novamente" }),
    ).toBeEnabled();
    const frozen = structuredClone(commands.at(-1));
    await first.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(
      first.getByText("Obrigado pelo feedback.", { exact: true }),
    ).toBeVisible();
    assert.deepEqual(commands.at(-1), frozen);
    await page.screenshot({
      path: path.join(output, `feedback-${mobile ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const count = commands.length;
    await page.reload();
    await expect(
      first.getByRole("button", { name: "Não", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    assert.equal(commands.length, count);
    await expect.poll(() => exposureRequests.length).toBe(2);
    assert.equal(observed.size, 1);
    await page
      .getByRole("textbox", { name: "Converse sobre a peça" })
      .fill("Outro exemplo sintético");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(ctas).toHaveCount(2);
    await expect(
      ctas.nth(1).getByRole("button", { name: "Não", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await first.getByRole("button", { name: "Retirar feedback" }).click();
    await expect(
      first.getByText("Feedback retirado.", { exact: true }),
    ).toBeVisible();
    person = "person-b";
    await page.getByRole("button", { name: "Trocar pessoa (QA)" }).click();
    await expect(
      first.getByRole("button", { name: "Sim", exact: true }),
    ).toBeEnabled();
    await expect(
      first.getByRole("button", { name: "Não", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    org = "org-b";
    person = "person-a";
    await page.getByRole("button", { name: "Trocar escritório (QA)" }).click();
    await expect(
      first.getByRole("button", { name: "Sim", exact: true }),
    ).toBeEnabled();
    revoked = true;
    await first.getByRole("button", { name: "Sim", exact: true }).click();
    await expect(first.getByRole("alert")).toContainText(
      "indisponível para você",
    );
    await expect(
      first.getByRole("button", { name: "Sim", exact: true }),
    ).toBeDisabled();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    reports.push({
      viewport: page.viewportSize(),
      feedbackCommands: commands.length,
      exposureRequests: exposureRequests.length,
      visibleExposureAndReload: true,
      exactRecovery: true,
      legacyAndRulesExcluded: true,
      newMessageIndependent: true,
      keyboard: true,
      externalRequests: 0,
      pageErrors: 0,
    });
    await context.close();
  }
  return reports;
}
