import assert from "node:assert/strict";
import path from "node:path";

export async function feedbackMetricsBrowserChecks(
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
      reads = [];
    let revoked = false,
      suppressed = false;
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
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Cache-Control": "private, no-store",
      };
      if (request.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers });
      assert.equal(request.method(), "GET");
      if (url.pathname === "/v1/curation/feedback-scopes") {
        return route.fulfill({
          headers,
          json: { data: revoked ? [] : [fixture.scope] },
        });
      }
      if (
        url.pathname !==
        `/v1/curation/feedback-scopes/${fixture.scope.id}/metrics`
      ) {
        unexpected.push(url.pathname);
        return route.abort();
      }
      assert.deepEqual([...url.searchParams.keys()].sort(), ["from", "to"]);
      reads.push(url.search);
      if (revoked)
        return route.fulfill({
          status: 404,
          headers,
          json: { kind: "ENTITY_NOT_FOUND", message: "Recorte revogado." },
        });
      const data = structuredClone(fixture);
      data.period_start = url.searchParams.get("from");
      data.period_end = url.searchParams.get("to");
      if (suppressed) data.rows[0].counts = null;
      return route.fulfill({ headers, json: { data } });
    });
    await page.goto("http://127.0.0.1:3000/backoffice/feedback");
    await page
      .getByRole("link", {
        name: `Consultar métricas de ${fixture.scope.name}`,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: fixture.scope.name }),
    ).toBeVisible();
    assert.equal(reads.length, 0);
    await page.getByLabel("De (UTC)", { exact: true }).fill("2026-10-01");
    await page.getByLabel("Até (UTC)", { exact: true }).fill("2026-10-01");
    const consult = page.getByRole("button", {
      name: "Consultar métricas",
      exact: true,
    });
    const participation = page.getByText(
      "Participação entre pares com exposição: 1 de 2 (50%).",
      { exact: true },
    );
    await consult.click();
    await expect(participation).toBeVisible();
    await expect(
      page.getByText(
        "Maior contribuição individual entre votos ativos: 2 de 3 (67%).",
        { exact: true },
      ),
    ).toBeVisible();
    await consult.click();
    await expect.poll(() => reads.length).toBe(2);
    await expect(participation).toBeVisible();
    assert.equal(reads[0], reads[1]);
    await page.screenshot({
      path: path.join(
        output,
        `feedback-metrics-${mobile ? "mobile" : "desktop"}.png`,
      ),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    suppressed = true;
    await consult.click();
    await expect(
      page.getByText(
        "Contagens ocultas: mínimo de contribuidores não atingido.",
      ),
    ).toBeVisible();
    await expect(participation).toHaveCount(0);
    revoked = true;
    await consult.click();
    await expect(page.getByText(/Relatório indisponível/)).toBeVisible();
    await expect(
      page.getByText(
        "Contagens ocultas: mínimo de contribuidores não atingido.",
      ),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Revalidar acesso", exact: true })
      .click();
    await expect(page.getByText(/Recorte indisponível/)).toBeVisible();
    await expect(consult).toHaveCount(0);
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    reports.push({
      mobile,
      metricRequests: reads.length,
      externalRequests: 0,
      pageErrors: 0,
    });
    await context.close();
  }
  return reports;
}
