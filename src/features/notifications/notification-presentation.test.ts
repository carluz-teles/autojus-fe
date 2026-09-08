import { describe, expect, it } from "vitest";

import {
  notificationContent,
  notificationHref,
  preferenceChannels,
} from "./notification-presentation";
import type { NotificationTypeDefinition } from "./types";

const definition: NotificationTypeDefinition = {
  type: "process_received",
  label: "Processo recebido",
  default_channels: ["IN_APP"],
  channels: ["IN_APP", "EMAIL"],
};

describe("notification preferences", () => {
  it("uses the catalog default without silently enabling email", () => {
    expect(preferenceChannels(definition, [])).toEqual(["IN_APP"]);
  });
  it("preserves an explicit opt-out", () => {
    expect(
      preferenceChannels(definition, [{ type: definition.type, channels: [] }]),
    ).toEqual([]);
  });
  it("keeps email independent from in-app", () => {
    expect(
      preferenceChannels(definition, [
        { type: definition.type, channels: ["EMAIL"] },
      ]),
    ).toEqual(["EMAIL"]);
  });
});

describe("notification destinations", () => {
  it.each([
    "/primeira-importacao",
    "/processos/abc-123",
    "/intimacoes/abc-123",
    "/providencias/abc-123",
    "/pecas/abc-123?retorno=%2Fnotificacoes",
  ])("accepts entity route %s", (href) => {
    expect(notificationHref({ payload: { href } })).toBe(href);
  });
  it.each([
    "https://example.com",
    "//example.com",
    "javascript:alert(1)",
    "/\\evil.com",
    "/processos/../sign-out",
    "/configuracoes",
    "/primeira-importacao/../sign-out",
    "/primeira-importacao?redirect=https://example.com",
    null,
    10,
  ])("rejects unsafe or unrelated destination %s", (href) => {
    expect(notificationHref({ payload: { href } })).toBeNull();
  });
  it("keeps legacy notifications readable without inventing a destination", () => {
    expect(notificationHref({})).toBeNull();
  });
});

describe("legacy notification links", () => {
  const id = "03394fc5-ecaf-4475-a821-5f65f6dd7183";
  it.each([
    ["draft_id", "pecas"],
    ["action_item_id", "providencias"],
    ["intimation_id", "intimacoes"],
    ["court_record_id", "processos"],
  ])("uses the entity id in %s", (key, route) => {
    expect(notificationHref({ payload: { [key]: id } })).toBe(
      `/${route}/${id}`,
    );
  });
  it("does not mistake a deadline id for an intimation", () => {
    expect(notificationHref({ payload: { deadline_id: id } })).toBeNull();
  });
  it("prioritizes a specific entity over its process context", () => {
    expect(
      notificationHref({
        payload: {
          action_item_id: id,
          court_record_id: "319aff0f-82de-42c8-b943-14f8a34ede6e",
        },
      }),
    ).toBe(`/providencias/${id}`);
  });
});

describe("notification entity identity", () => {
  it("highlights the real entity title and removes only the duplicated body prefix", () => {
    const title = "Empresa A x Empresa B";
    const cnj = "4003451-51.2026.8.26.0196";
    const detail = `${title} · Processo ${cnj}`;
    const view = notificationContent({
      title: "Processo recebido",
      body: `${detail}. O processo foi adicionado ao escritório.`,
      payload: { title, cnj, detail },
    });
    expect(view.entityTitle).toBe(title);
    expect(view.eventLabel).toBe("Processo recebido");
    expect(view.description).toBe("O processo foi adicionado ao escritório.");
    expect(view.cnj).toBe(cnj);
  });
  it("does not invent an intimation name when the payload has none", () => {
    const view = notificationContent({
      title: "Intimação recebida",
      body: "Nova publicação disponível.",
      payload: { intimation_type: "despacho" },
    });
    expect(view.entityTitle).toBe("Intimação recebida");
    expect(view.hasEntityTitle).toBe(false);
    expect(view.description).toBe("Nova publicação disponível.");
  });
  it("keeps unstructured legacy text intact", () => {
    const body =
      "Uma providência relacionada ao Processo 123 foi atribuída a você.";
    expect(
      notificationContent({
        title: "Providência atribuída",
        body,
        payload: { cnj: "123" },
      }).description,
    ).toBe(body);
  });
});

it("shows the process name and separate CNJ without repeating the number", () => {
  const cnj = "4003451-51.2026.8.26.0196";
  const view = notificationContent({
    title: "Intimação recebida",
    body: "Consulte a publicação.",
    payload: {
      process_title: `Empresa executada · ${cnj}`,
      cnj,
      entity_title: "Despacho · 07/09/2026",
    },
  });
  expect(view.entityTitle).toBe("Empresa executada");
  expect(view.relatedTitle).toBe("Despacho · 07/09/2026");
  expect(view.cnj).toBe(cnj);
});

it("keeps a providence title primary and its process name as context", () => {
  const view = notificationContent({
    title: "Providência atribuída",
    body: "Você foi atribuído.",
    payload: {
      title: "Preparar manifestação",
      process_title: "Empresa executada",
      cnj: "123",
    },
  });
  expect(view.entityTitle).toBe("Preparar manifestação");
  expect(view.relatedTitle).toBe("Empresa executada");
});

it.each([
  ["40066204620268260196", "40066204620268260196"],
  ["40066204620268260196", "4006620-46.2026.8.26.0196"],
  ["4006620-46.2026.8.26.0196", "40066204620268260196"],
])("formats payload CNJ %s and removes title suffix %s", (cnj, titleCNJ) => {
  const view = notificationContent({
    title: "Processo recebido",
    body: `Processo ${cnj}. Consulte o processo.`,
    payload: { cnj, title: `Empresa executada · ${titleCNJ}` },
  });
  expect(view.cnj).toBe("4006620-46.2026.8.26.0196");
  expect(view.entityTitle).toBe("Empresa executada");
  expect(view.description).toBe("Consulte o processo.");
});
