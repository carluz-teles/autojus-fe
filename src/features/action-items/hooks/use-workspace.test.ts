import { describe, expect, it } from "vitest";

import { buildWorkMutationRequest } from "./use-workspace";

describe("buildWorkMutationRequest", () => {
  it("envia accept_completed pelo endpoint de actions", () => {
    expect(
      buildWorkMutationRequest({
        id: "suggestion-1",
        action: "accept_completed",
      }),
    ).toEqual({
      path: "/v1/action-items/suggestion-1/actions",
      method: "POST",
      body: { action: "accept_completed" },
    });
  });

  it("preserva o endpoint legado para iniciar e concluir trabalho", () => {
    expect(buildWorkMutationRequest({ id: "work-1", action: "start" })).toEqual(
      {
        path: "/v1/action-items/work-1/comecar",
        method: "POST",
        body: {},
      },
    );
  });
});
