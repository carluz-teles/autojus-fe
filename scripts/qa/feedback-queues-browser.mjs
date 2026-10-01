import assert from "node:assert/strict";
import path from "node:path";

export async function feedbackQueuesBrowserChecks(
  browser,
  expect,
  fixture,
  output,
) {
  const reports = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 1000 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [],
      unexpected = [],
      posts = [];
    const scope = fixture.feedbackCurationScopeFixture;
    let queue = null,
      revoked = false,
      removed = false;
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin === "http://127.0.0.1:3000") return route.continue();
      if (url.origin !== "http://127.0.0.1:18080") {
        unexpected.push(url.origin);
        return route.abort();
      }
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Cache-Control": "private, no-store",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      if (revoked)
        return route.fulfill({
          status: 404,
          headers,
          json: { kind: "ENTITY_NOT_FOUND", message: "Concessão revogada." },
        });
      if (url.pathname === "/v1/curation/feedback-curation-scopes")
        return route.fulfill({ headers, json: { data: [scope] } });
      if (url.pathname === "/v1/curation/feedback-queues") {
        if (request.method() === "GET")
          return route.fulfill({
            headers,
            json: {
              data: queue ? [queue] : [],
              page: { next_cursor: null, limit: 20 },
            },
          });
        assert.equal(request.method(), "POST");
        const body = request.postDataJSON();
        posts.push(body);
        assert.equal(body.scope_id, scope.id);
        assert.equal(body.expected_scope_revision, 1);
        assert.equal("seed" in body, false);
        assert.equal("tenant_id" in body, false);
        if (!queue) {
          queue = {
            ...structuredClone(fixture.feedbackQueueFixture),
            from: body.from,
            to: body.to,
            quotas: body.quotas,
          };
          return route.abort("failed");
        }
        assert.deepEqual(body, posts[0]);
        return route.fulfill({
          headers,
          json: { data: { ...queue, replayed: true } },
        });
      }
      if (
        queue &&
        url.pathname === `/v1/curation/feedback-queues/${queue.id}`
      ) {
        const data = structuredClone(queue);
        if (removed) data.items[0].available = false;
        return route.fulfill({ headers, json: { data } });
      }
      unexpected.push(url.pathname);
      return route.abort();
    });
    await page.goto("http://127.0.0.1:3000/backoffice/feedback-queues");
    await page
      .getByRole("link", { name: `Preparar fila de ${scope.name}` })
      .click();
    await expect(page.getByRole("heading", { name: scope.name })).toBeVisible();
    assert.equal(posts.length, 0);
    await page.getByLabel("De (UTC)", { exact: true }).fill("2026-10-01");
    await page.getByLabel("Até (UTC)", { exact: true }).fill("2026-10-01");
    await page
      .getByRole("button", { name: "Gerar fila de interesse", exact: true })
      .click();
    await expect(page.getByText(/O envio pode ter sido salvo/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Revalidar acesso", exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel("Aleatória", { exact: true })).toBeDisabled();
    await page
      .getByRole("button", { name: "Recuperar envio", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Fila de interesse", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/4 selecionados entre 12 resultados/),
    ).toBeVisible();
    await expect(
      page.getByText("1 de 25 solicitados · 24 não preenchidos", {
        exact: true,
      }),
    ).toHaveCount(4);
    assert.equal(posts.length, 2);
    removed = true;
    await page
      .getByRole("button", { name: "Revalidar fila", exact: true })
      .click();
    await expect(
      page.getByText(
        "Fonte indisponível. Este resultado não pode ser admitido.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(
        output,
        `feedback-queue-${mobile ? "mobile" : "desktop"}.png`,
      ),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    revoked = true;
    await page
      .getByRole("button", { name: "Revalidar fila", exact: true })
      .click();
    await expect(page.getByText(/Fila indisponível/)).toBeVisible();
    await expect(
      page.getByText(/4 selecionados entre 12 resultados/),
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    reports.push({
      mobile,
      selectionRequests: posts.length,
      persistedSelections: 1,
      externalRequests: 0,
      pageErrors: 0,
    });
    await context.close();
  }
  return reports;
}
