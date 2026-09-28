import { describe, expect, it } from "vitest";

import { resolverAssigneeScope } from "./assignee-scope";

describe("resolverAssigneeScope", () => {
  it('default "Minha visão" mapeia para mine_or_unassigned (nunca envia assignee junto)', () => {
    expect(resolverAssigneeScope("minha_visao")).toEqual({
      assigneeScope: "mine_or_unassigned",
    });
  });

  it('"mine" e "unassigned" mapeiam 1:1 para o escopo correspondente', () => {
    expect(resolverAssigneeScope("mine")).toEqual({ assigneeScope: "mine" });
    expect(resolverAssigneeScope("unassigned")).toEqual({
      assigneeScope: "unassigned",
    });
  });

  it('"todos" (Todo o escritório) não usa escopo nem assignee', () => {
    expect(resolverAssigneeScope("todos")).toEqual({});
  });

  it('"" (ausente/legado) também não usa escopo nem assignee', () => {
    expect(resolverAssigneeScope("")).toEqual({});
  });

  it("um colega específico (id) vai como assignee explícito, nunca com escopo", () => {
    const result = resolverAssigneeScope("user-123");
    expect(result).toEqual({ assignee: "user-123" });
    expect(result.assigneeScope).toBeUndefined();
  });

  it("nunca retorna assignee e assigneeScope simultaneamente (contrato do BE: 400 se os dois vierem juntos)", () => {
    for (const value of [
      "minha_visao",
      "mine",
      "unassigned",
      "",
      "todos",
      "colega-x",
    ]) {
      const result = resolverAssigneeScope(value);
      expect(!!result.assignee && !!result.assigneeScope).toBe(false);
    }
  });
});
