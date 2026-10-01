import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
export async function releaseBrowserChecks(browser, expect, output) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
      acceptDownloads: true,
    }),
    page = await context.newPage();
  const id = "11111111-1111-4111-8111-111111111111",
    batch = "22222222-2222-4222-8222-222222222222",
    decision = "33333333-3333-4333-8333-333333333333";
  // A minimal synthetic ZIP for transport/hash checks only. The real artifact
  // contract and JSONL verification are exercised by the backend integrations.
  const bytes = Buffer.from("UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==", "base64"),
    digest = createHash("sha256").update(bytes).digest("hex");
  const manifest = {
    schema_version: "intimation-release-v1",
    policy_version: "intimation-release-policy-v1",
    task_kind: "intimation_annotation",
    batch_id: batch,
    frame_id: "frame",
    frame_digest: "d".repeat(64),
    protocol_id: "protocol",
    protocol_digest: "e".repeat(64),
    origin: "synthetic",
    purpose: "evaluation",
    included_count: 1,
    excluded_count: 1,
    split_counts: { train: 1, validation: 0, test: 0 },
    items: [
      {
        task_id: "task-1",
        gold_revision_id: decision,
        content_digest: "c".repeat(64),
        snapshot_digest: "s".repeat(64),
        group_digest: "g".repeat(64),
        split: "train",
        stratum: "resolved",
        inclusion_numerator: 1,
        inclusion_denominator: 2,
        quality: "assisted_reviewed",
        included: true,
        reasons: [],
      },
      {
        task_id: "task-2",
        gold_revision_id: null,
        content_digest: null,
        snapshot_digest: "s".repeat(64),
        group_digest: "h".repeat(64),
        split: "test",
        stratum: "rare",
        inclusion_numerator: 1,
        inclusion_denominator: 1,
        quality: null,
        included: false,
        reasons: ["gold_missing"],
      },
    ],
  };
  let release = null,
    job = null,
    jobReads = 0,
    withdrawn = false,
    firstDownload = true;
  const created = [],
    published = [],
    downloads = [],
    emissions = [],
    external = [],
    errors = [];
  const headers = {
    "access-control-allow-origin": "http://127.0.0.1:3000",
    "access-control-allow-headers": "Content-Type,Authorization",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-expose-headers":
      "X-Dataset-Release-Id,X-Dataset-Request-Id,X-Dataset-Delivery-Id,X-Dataset-Source-Manifest-Sha256,X-Dataset-Manifest-Sha256,X-Dataset-Canonical-Sha256,X-Dataset-Canonical-Bytes,X-Dataset-Bundle-Sha256,X-Idempotent-Replay",
  };
  const pageData = (data) => ({ data, page: { next_cursor: null, limit: 20 } });
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
    if (method === "GET" && p.endsWith("/publication-batches"))
      return reply(
        pageData([
          {
            id: batch,
            frame_id: "frame",
            protocol_id: "protocol",
            task_kind: manifest.task_kind,
            task_count: 2,
            valid: true,
            recorded_at: "2026-09-30T12:00:00Z",
          },
        ]),
      );
    if (method === "GET" && p.endsWith("/dataset-releases"))
      return reply(
        pageData(
          release
            ? [
                {
                  ...release,
                  batch_id: batch,
                  purpose: "evaluation",
                  origin: "synthetic",
                  included_count: 1,
                  excluded_count: 1,
                  withdrawn,
                },
              ]
            : [],
        ),
      );
    if (method === "GET" && p.endsWith("/release-preview"))
      return reply({
        data: {
          digest: "a".repeat(64),
          manifest: { ...manifest, purpose: url.searchParams.get("purpose") },
        },
      });
    if (method === "POST" && p.endsWith("/dataset-releases")) {
      const body = req.postDataJSON();
      created.push(body);
      if (!release) {
        release = {
          id,
          name: body.name,
          manifest_digest: body.expected_preview_digest,
          manifest,
          frozen_at: "2026-09-30T12:00:00Z",
          eligible: true,
          withdrawn: false,
          blockers: [],
          idempotent_replay: false,
        };
        return route.abort("failed");
      }
      assert.deepEqual(body, created[0]);
      return reply({ data: { ...release, idempotent_replay: true } });
    }
    if (method === "GET" && p.endsWith(`/dataset-releases/${id}`))
      return reply({
        data: {
          ...release,
          eligible: !withdrawn,
          withdrawn,
          blockers: withdrawn
            ? [{ task_id: null, reasons: ["release_withdrawn"] }]
            : [],
        },
      });
    if (method === "POST" && p.endsWith("/publication-jobs")) {
      published.push(req.postDataJSON());
      job = {
        id: "job",
        release_id: id,
        state: "queued",
        attempts: 0,
        failure_code: null,
        requested_at: "2026-09-30T12:00:00Z",
        updated_at: "2026-09-30T12:00:00Z",
        available: false,
        blockers: [],
        publication: null,
        idempotent_replay: false,
      };
      return reply({ data: job }, 202);
    }
    if (method === "GET" && p.endsWith("/publication-jobs")) {
      if (job && ++jobReads >= 2) {
        job = {
          ...job,
          state: "published",
          attempts: 1,
          available: !withdrawn,
          publication: {
            canonical_digest: "c".repeat(64),
            manifest_digest: "b".repeat(64),
            canonical_bytes: 5,
            published_at: "2026-09-30T12:00:00Z",
            cleanup_state: withdrawn ? "pending" : "none",
          },
          blockers: withdrawn
            ? [{ task_id: null, reasons: ["release_withdrawn"] }]
            : [],
        };
      }
      return reply({ data: job ? [job] : [] });
    }
    if (method === "GET" && p.endsWith("/downloads"))
      return reply(pageData(emissions));
    if (method === "POST" && p.endsWith("/downloads")) {
      if (withdrawn)
        return reply({ kind: "CONFLICT", message: "Dataset retirado" }, 409);
      const body = req.postDataJSON();
      downloads.push(body);
      const delivery = `44444444-4444-4444-8444-${String(downloads.length).padStart(12, "0")}`;
      emissions.unshift({
        id: delivery,
        request_id: body.request_id,
        actor_id: "operator",
        issued_at: "2026-09-30T12:00:00Z",
        bundle_digest: digest,
        bundle_bytes: bytes.length,
        format_version: "intimation-bundle-v1",
      });
      if (firstDownload) {
        firstDownload = false;
        return route.abort("failed");
      }
      assert.deepEqual(body, downloads[0]);
      return route.fulfill({
        status: 200,
        body: bytes,
        headers: {
          ...headers,
          "content-type": "application/zip",
          "content-length": String(bytes.length),
          "x-dataset-release-id": id,
          "x-dataset-request-id": body.request_id,
          "x-dataset-delivery-id": delivery,
          "x-dataset-source-manifest-sha256": "a".repeat(64),
          "x-dataset-manifest-sha256": "b".repeat(64),
          "x-dataset-canonical-sha256": "c".repeat(64),
          "x-dataset-canonical-bytes": "5",
          "x-dataset-bundle-sha256": digest,
          "x-idempotent-replay": "true",
        },
      });
    }
    if (method === "POST" && p.endsWith("/withdrawals")) {
      assert(req.postDataJSON().reason);
      withdrawn = true;
      return reply({
        data: {
          ...release,
          withdrawn: true,
          eligible: false,
          blockers: [{ task_id: null, reasons: ["release_withdrawn"] }],
        },
      });
    }
    throw new Error(`Unexpected dataset fixture: ${method} ${p}`);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:3000/backoffice/releases");
  await page
    .getByRole("link", { name: "Conferir inclusão e exclusões do lote" })
    .click();
  await page
    .getByText("Conferir todos os itens e exclusões", { exact: true })
    .click();
  await expect(
    page.getByText("A tarefa ainda não tem gold publicado."),
  ).toBeVisible();
  await page
    .getByLabel("Nome do dataset")
    .fill("Avaliação sintética da bancada");
  await page
    .getByLabel(
      "Conferi as inclusões, exclusões e a finalidade deste manifesto.",
    )
    .check();
  await page
    .getByRole("button", { name: "Congelar dataset", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recuperar criação do dataset" })
    .click();
  await page
    .getByRole("link", { name: "Acompanhar publicação do dataset" })
    .click();
  await page.getByLabel("Confirmo a publicação deste dataset.").check();
  await page
    .getByRole("button", { name: "Publicar arquivos", exact: true })
    .click();
  await expect(
    page.getByText("Publicado · 1 tentativa(s)", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  assert.equal(published.length, 1);
  await expect(
    page.getByRole("button", { name: "Baixar dataset verificado" }),
  ).toBeEnabled();
  await page
    .getByLabel("Confirmo a exposição aos gabaritos e o download auditado.")
    .check();
  await page.getByRole("button", { name: "Baixar dataset verificado" }).click();
  await expect(
    page.getByRole("button", { name: "Recuperar ação do dataset" }),
  ).toBeVisible();
  const saved = page.waitForEvent("download");
  await page.getByRole("button", { name: "Recuperar ação do dataset" }).click();
  const file = await saved;
  assert.equal(file.suggestedFilename(), `dataset-${id}.zip`);
  assert.deepEqual(await fs.readFile(await file.path()), bytes);
  await expect(
    page.getByText("Arquivo recebido e verificado;", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "dataset-published-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Motivo da retirada do dataset")
    .fill("Retirada sintética após verificar o download.");
  await page
    .getByLabel("Confirmo a retirada permanente deste dataset.")
    .check();
  await page
    .getByRole("button", { name: "Retirar dataset", exact: true })
    .click();
  await expect(
    page.getByText("Retirada do dataset registrada.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Baixar dataset verificado" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Dataset retirado", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(output, "dataset-withdrawn-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.equal(created.length, 2);
  assert.equal(published.length, 1);
  assert.equal(downloads.length, 2);
  assert(jobReads >= 2);
  await context.close();
  return {
    creationRequests: 2,
    publicationRequests: 1,
    downloadRequests: 2,
    identicalRecovery: true,
    binaryHashVerified: true,
    withdrawalBlocksDownloadAfterReload: true,
    paidProviderCalls: 0,
    externalRequests: 0,
    pageErrors: 0,
  };
}
