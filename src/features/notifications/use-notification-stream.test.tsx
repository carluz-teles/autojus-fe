// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";

import { useNotificationStream } from "./use-notification-stream";

const mocks = vi.hoisted(() => ({
  stream: vi.fn(),
  invalidate: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: true,
    orgId: "org",
    userId: "user",
    getToken: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: mocks.stream,
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
function Probe() {
  useNotificationStream();
  return null;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("refreshes court connections when an established or failed SSE notification arrives", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.stream.mockResolvedValue(undefined);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(Probe)));
  const options = mocks.stream.mock.calls[0][1];
  for (const type of [
    "court_connection_established",
    "court_connection_failed",
  ]) {
    await act(async () =>
      options.onmessage({
        event: "notification",
        data: JSON.stringify({
          id: type,
          type,
          title: "Tribunal",
          body: "Atualizado",
          payload: { href: "/configuracoes?tab=fontes" },
        }),
      }),
    );
  }
  expect(mocks.invalidate).toHaveBeenCalledWith({
    queryKey: ["court-connections"],
  });
  expect(
    mocks.invalidate.mock.calls.filter(
      ([arg]) => arg.queryKey?.[0] === "court-connections",
    ),
  ).toHaveLength(2);
  expect(mocks.toast).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
  container.remove();
});
