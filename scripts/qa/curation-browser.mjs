import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { candidateBrowserChecks } from "./candidate-browser.mjs";
import { closedTestBrowserChecks } from "./closed-test-browser.mjs";
import { comparisonBrowserChecks } from "./comparison-browser.mjs";
import { decisionBrowserChecks } from "./decision-browser.mjs";
import { evaluationBrowserChecks } from "./evaluation-browser.mjs";
import { feedbackBrowserChecks } from "./feedback-browser.mjs";
import { feedbackMetricsBrowserChecks } from "./feedback-metrics-browser.mjs";
import { feedbackQueuesBrowserChecks } from "./feedback-queues-browser.mjs";
import { goldBrowserChecks } from "./gold-browser.mjs";
import { preparationBrowserChecks } from "./preparation-browser.mjs";
import { ragBrowserChecks } from "./rag-browser.mjs";
import { releaseBrowserChecks } from "./release-browser.mjs";
import { withdrawalBrowserChecks } from "./withdrawal-browser.mjs";

const root = process.cwd();
assert(
  root.includes("atjud-frontend-"),
  "Browser fixture may run only in the disposable copy",
);
const { chromium, expect } = await import(
  pathToFileURL(path.join(process.env.OFFLINE_PLAYWRIGHT_DIR, "test.mjs")).href
);
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");
async function loadFixture(file) {
  const source = await fs.readFile(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}
const { annotationFixture } = await loadFixture(
  "src/features/curation/__tests__/annotation-fixture.ts",
);
const output = process.env.QA_ARTIFACT_DIR;
await fs.mkdir(output, { recursive: true, mode: 0o700 });
for (const port of [3000, 3001]) {
  const probe = net.createServer();
  await new Promise((resolve, reject) =>
    probe.once("error", reject).listen(port, "127.0.0.1", resolve),
  );
  await new Promise((resolve) => probe.close(resolve));
}
const log = await fs.open(path.join(output, "next-dev.log"), "w", 0o600);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  { cwd: root, env: process.env, stdio: ["ignore", log.fd, log.fd] },
);
let browser;
const report = {
  kind: "synthetic-curation-ui",
  realBackend: false,
  realClerk: false,
  paidProviderCalls: 0,
  cases: [],
};
try {
  await expect
    .poll(
      async () => {
        if (server.exitCode !== null)
          throw new Error("Disposable dev server exited; inspect next-dev.log");
        return new Promise((resolve) => {
          const socket = net.connect(3000, "127.0.0.1");
          socket.once("connect", () => {
            socket.destroy();
            resolve(true);
          });
          socket.once("error", () => resolve(false));
        });
      },
      { timeout: 60000 },
    )
    .toBe(true);
  browser = await chromium.launch({
    executablePath: process.env.OFFLINE_CHROME_BIN,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  if (process.env.QA_BROWSER_SUITE === "feedback") {
    report.kind = "synthetic-feedback-ui";
    report.feedback = await feedbackBrowserChecks(browser, expect, output);
  } else if (process.env.QA_BROWSER_SUITE === "feedback-metrics") {
    const { metricsFixture } = await loadFixture(
      "src/features/curation/__tests__/feedback-metrics-fixture.ts",
    );
    report.kind = "synthetic-feedback-metrics-ui";
    report.metrics = await feedbackMetricsBrowserChecks(
      browser,
      expect,
      metricsFixture,
      output,
    );
  } else if (process.env.QA_BROWSER_SUITE === "feedback-queues") {
    const fixture = await loadFixture(
      "src/features/curation/__tests__/feedback-queue-fixture.ts",
    );
    report.kind = "synthetic-feedback-queues-ui";
    report.queues = await feedbackQueuesBrowserChecks(
      browser,
      expect,
      fixture,
      output,
    );
  } else if (process.env.QA_BROWSER_SUITE === "rag") {
    report.kind = "synthetic-rag-ui";
    report.rag = await ragBrowserChecks(
      browser,
      expect,
      annotationFixture,
      output,
    );
  } else {
    for (const mode of ["assisted", "blind"]) {
      const context = await browser.newContext({
        viewport:
          mode === "assisted"
            ? { width: 1440, height: 1000 }
            : { width: 390, height: 844 },
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const input = annotationFixture(mode);
      input.snapshot.facts.context.commercial_type = {
        schema_version: "intimation-commercial-type-v1",
        document_type: "Despacho capturado sintético",
        communication_kind: null,
        intimation_type: "INTIMACAO",
        declared_deadline: "",
      };
      const batch = {
        id: "synthetic-batch",
        frame_id: "synthetic-frame",
        protocol_id: input.snapshot.protocol_id,
        task_kind: input.protocol.task_kind,
        task_count: 1,
        valid: true,
        recorded_at: new Date().toISOString(),
        idempotent_replay: false,
      };
      const receipts = new Map();
      const commands = [],
        external = [],
        errors = [];
      let claimed = false,
        submission = null,
        dropFirstDraft = mode === "assisted";
      const headers = {
        "access-control-allow-origin": "http://127.0.0.1:3000",
        "access-control-allow-headers": "Content-Type,Authorization",
        "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      };
      const envelope = (data) => ({ data });
      const pageData = (data) => ({
        data,
        page: { next_cursor: null, limit: 20 },
      });
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
        const pathname = url.pathname;
        if (pathname === "/v1/curation/annotation-queue/batches")
          return reply(pageData([batch]));
        if (pathname === "/v1/curation/annotation-queue/synthetic-batch")
          return reply(
            pageData([
              {
                id: input.assignment.task_id,
                batch_id: batch.id,
                mode,
                split: mode === "blind" ? "test" : "train",
                snapshot_digest: input.snapshot_digest,
                protocol_id: batch.protocol_id,
                protocol_digest: input.snapshot.protocol_digest,
                slot_available: !claimed,
                prediction_ready: true,
              },
            ]),
          );
        if (pathname === "/v1/curation/annotation-assignments")
          return reply(pageData(claimed ? [input.assignment] : []));
        const prefix = `/v1/curation/annotation-assignments/${input.assignment.id}`;
        if (request.method() === "GET") {
          if (pathname === prefix)
            return reply(
              envelope({
                assignment: input.assignment,
                batch_id: batch.id,
                ...(submission ? { submission } : {}),
              }),
            );
          if (pathname === `${prefix}/input`) return reply(envelope(input));
          if (pathname === `${prefix}/draft`)
            return reply(envelope(input.draft));
          if (
            pathname.startsWith("/v1/curation/annotation-submissions/") &&
            submission
          )
            return reply(envelope(submission));
        }
        const body = request.postDataJSON();
        commands.push({ path: pathname, body });
        if (receipts.has(body?.request_id))
          return reply(
            envelope({
              ...receipts.get(body.request_id),
              assignment: input.assignment,
              idempotent_replay: true,
            }),
          );
        let receipt;
        if (pathname.endsWith("/assignments")) {
          claimed = true;
          receipt = { assignment: input.assignment, idempotent_replay: false };
        } else if (pathname === `${prefix}/draft`) {
          assert.equal(body.expected_draft_revision, input.draft.revision);
          input.draft = {
            assignment_id: input.assignment.id,
            revision: input.draft.revision + 1,
            annotation: body.annotation,
            updated_at: new Date().toISOString(),
          };
          receipt = {
            assignment: input.assignment,
            draft: {
              assignment_id: input.assignment.id,
              revision: input.draft.revision,
              updated_at: input.draft.updated_at,
            },
            idempotent_replay: false,
          };
          receipts.set(body.request_id, structuredClone(receipt));
          if (dropFirstDraft) {
            dropFirstDraft = false;
            return route.abort("failed");
          }
        } else if (pathname === `${prefix}/submissions`) {
          input.assignment = {
            ...input.assignment,
            state: "submitted",
            revision: input.assignment.revision + 1,
          };
          submission = {
            id: "synthetic-submission",
            assignment_id: input.assignment.id,
            digest: "c".repeat(64),
            blind_eligible: mode === "blind",
            submitted_at: new Date().toISOString(),
            annotation: body.annotation,
            valid: true,
          };
          receipt = {
            assignment: input.assignment,
            submission,
            idempotent_replay: false,
          };
        } else
          return reply(
            {
              kind: "ENTITY_NOT_FOUND",
              message: "Synthetic endpoint not configured",
            },
            404,
          );
        receipts.set(body.request_id, structuredClone(receipt));
        return reply(envelope(receipt), 201);
      });
      // The ordinary commercial route is deliberately unauthenticated. No Clerk
      // login is attempted; its error/empty state is not a curation acceptance gate.
      if (mode === "assisted")
        await page.goto("http://127.0.0.1:3000/processos", {
          waitUntil: "domcontentloaded",
        });
      external.length = 0;
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:3000/backoffice/curation", {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { name: "Revisar intimações", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Lote de revisão").selectOption(batch.id);
      await page.getByRole("button", { name: "Reservar e revisar" }).click();
      await expect(page.getByLabel("Teor integral da intimação")).toHaveValue(
        input.snapshot.facts.text,
        { timeout: 15000 },
      );
      await expect(
        page.getByText("Despacho capturado sintético", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Não capturado", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Capturado vazio", { exact: true }),
      ).toBeVisible();
      if (mode === "blind")
        await expect(
          page.getByRole("region", { name: "Sugestão original" }),
        ).toHaveCount(0);
      else
        await expect(
          page.getByRole("region", { name: "Sugestão original" }),
        ).toBeVisible();
      await page
        .getByLabel("Quanto é possível determinar?")
        .selectOption("insufficient");
      await page
        .getByLabel("Contexto que falta, um item por linha")
        .fill("destinatário");
      await page
        .getByLabel("Por que o contexto é insuficiente?")
        .fill("O exemplo sintético não informa o papel do destinatário.");
      if (mode === "assisted") {
        await expect(
          page.getByRole("button", {
            name: "Recuperar exatamente o último envio",
          }),
        ).toBeVisible();
        // A lost save response is still unsaved work. Browser Back must offer
        // staying on this document, not silently traverse the client router.
        await page.getByLabel("Por que o contexto é insuficiente?").click();
        const dialogs = [];
        const dismiss = async (dialog) => {
          dialogs.push(dialog.type());
          await dialog.dismiss();
        };
        page.on("dialog", dismiss);
        const back = page
          .goBack({ waitUntil: "commit", timeout: 5000 })
          .catch((error) => {
            if (!dialogs.includes("beforeunload")) throw error;
          });
        await expect.poll(() => dialogs).toEqual(["beforeunload"]);
        await back;
        page.off("dialog", dismiss);
        await expect(
          page.getByLabel("Por que o contexto é insuficiente?"),
        ).toHaveValue(
          "O exemplo sintético não informa o papel do destinatário.",
        );
        await page
          .getByRole("button", { name: "Recuperar exatamente o último envio" })
          .click();
        await expect(
          page.getByRole("button", { name: "Submeter minha resposta" }),
        ).toBeEnabled();
        const saves = commands.filter((command) =>
          command.path.endsWith("/draft"),
        );
        assert.equal(saves.length, 2);
        assert.deepEqual(saves[0].body, saves[1].body);
      }
      await page.screenshot({
        path: path.join(output, `${mode}-questionnaire.png`),
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        "horizontal overflow",
      );
      await page
        .getByRole("button", { name: "Submeter minha resposta" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Sua resposta foi registrada" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Escolher próximo caso do lote" }),
      ).toBeVisible();
      assert.equal(
        commands.filter((command) => command.path.endsWith("/submissions"))
          .length,
        1,
      );
      assert.equal(submission.annotation.label.answerability, "insufficient");
      assert.deepEqual(external, []);
      assert.deepEqual(errors, []);
      report.cases.push({
        mode,
        viewport: context.pages()[0].viewportSize(),
        submissions: 1,
        draftRequests: commands.filter((command) =>
          command.path.endsWith("/draft"),
        ).length,
        externalRequests: 0,
        pageErrors: 0,
        browserBackPreservedEdits: mode === "assisted" ? true : null,
      });
      await context.close();
    }
    report.decisions = await decisionBrowserChecks(
      browser,
      expect,
      annotationFixture,
      output,
    );
    report.preparation = await preparationBrowserChecks(
      browser,
      expect,
      annotationFixture,
      output,
    );
    report.gold = await goldBrowserChecks(browser, expect, output);
    report.releases = await releaseBrowserChecks(browser, expect, output);
    report.withdrawals = await withdrawalBrowserChecks(browser, expect, output);
    report.evaluations = await evaluationBrowserChecks(browser, expect, output);
    report.comparisons = await comparisonBrowserChecks(browser, expect, output);
    report.candidates = await candidateBrowserChecks(browser, expect, output);
    report.closedTests = await closedTestBrowserChecks(browser, expect, output);
  }
  await fs.writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    `Curation UI browser checks passed; synthetic artifacts: ${output}`,
  );
} catch (error) {
  for (const [index, context] of (browser?.contexts() ?? []).entries()) {
    for (const [pageIndex, page] of context.pages().entries()) {
      await page.screenshot({
        path: path.join(output, `failure-${index}-${pageIndex}.png`),
        fullPage: true,
      });
    }
  }
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    const timer = setTimeout(() => server.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
  }
  await log.close();
}
