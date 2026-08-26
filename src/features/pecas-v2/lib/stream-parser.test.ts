// stream-parser.test.ts — regressão do bug "folha em branco até o fim,
// texto aparece tudo de uma vez". Causa raiz: o parser usava match de
// substring LITERAL (`"draft_markdown":"`) pra achar a abertura do campo no
// JSON incremental do stream. Providers da OpenRouter que fazem pretty-print
// do JSON (confirmado: google/gemini-2.5-flash) emitem espaço/quebra de
// linha entre a chave, os dois-pontos e a aspa de abertura do valor
// (`"draft_markdown": "` ou `"draft_markdown" :\n  "`) — o match literal
// nunca encontrava essa abertura, o parser ficava preso em BeforeField pro
// stream inteiro, e `full()` sempre devolvia "". Estes testes cobrem os 3
// formatos de JSON observados, tanto num único chunk quanto fragmentados em
// pedaços arbitrários (o caso real: o SSE corta o JSON em qualquer ponto).

import { describe, expect, it } from "vitest";

import { createStreamingJsonFieldParser } from "./stream-parser";

const MARKDOWN = "# Título\n\nCorpo do texto com **negrito** e mais linhas.";

function compactJson(markdown: string): string {
  return `{"draft_markdown":"${markdown.replace(/\n/g, "\\n")}"}`;
}

function prettyWithSpaceJson(markdown: string): string {
  return `{\n  "draft_markdown": "${markdown.replace(/\n/g, "\\n")}"\n}`;
}

function prettyWithNewlineBeforeValueJson(markdown: string): string {
  return `{\n  "draft_markdown" :\n  "${markdown.replace(/\n/g, "\\n")}"\n}`;
}

/** Fragmenta uma string em pedaços de tamanho fixo pequeno, simulando o
 *  corte arbitrário de um stream SSE real. */
function fragment(input: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

describe("createStreamingJsonFieldParser", () => {
  const cases: Array<[string, (markdown: string) => string]> = [
    ["compacto (sem espaço)", compactJson],
    ["pretty com espaço após os dois-pontos", prettyWithSpaceJson],
    [
      "pretty com quebra de linha antes do valor",
      prettyWithNewlineBeforeValueJson,
    ],
  ];

  for (const [label, build] of cases) {
    it(`extrai o valor completo — formato ${label} — num único chunk`, () => {
      const parser = createStreamingJsonFieldParser("draft_markdown");
      const payload = build(MARKDOWN);

      parser.push(payload);

      expect(parser.full()).toBe(MARKDOWN);
    });

    it(`extrai o valor completo — formato ${label} — fragmentado em chunks pequenos`, () => {
      const parser = createStreamingJsonFieldParser("draft_markdown");
      const payload = build(MARKDOWN);
      const chunks = fragment(payload, 3);

      let emitted = "";
      for (const chunk of chunks) {
        emitted += parser.push(chunk);
      }

      expect(emitted).toBe(MARKDOWN);
      expect(parser.full()).toBe(MARKDOWN);
    });

    it(`cresce progressivamente (múltiplos incrementos não vazios) — formato ${label}`, () => {
      const parser = createStreamingJsonFieldParser("draft_markdown");
      const payload = build(MARKDOWN);
      const chunks = fragment(payload, 3);

      const lengths: number[] = [];
      for (const chunk of chunks) {
        parser.push(chunk);
        lengths.push(parser.full().length);
      }

      // full() deve crescer monotonicamente e passar por vários valores
      // intermediários > 0 antes de chegar ao tamanho final — não pode
      // ficar em 0 até o penúltimo chunk (esse era o bug).
      const nonZeroSamples = lengths.filter(
        (len) => len > 0 && len < MARKDOWN.length,
      );
      expect(nonZeroSamples.length).toBeGreaterThan(1);
      for (let i = 1; i < lengths.length; i++) {
        expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
      }
      expect(lengths[lengths.length - 1]).toBe(MARKDOWN.length);
    });
  }

  it("não emite nada enquanto o campo ainda não abriu (BeforeField)", () => {
    const parser = createStreamingJsonFieldParser("draft_markdown");

    const out = parser.push('{"other_field":"valor irrelevante"');

    expect(out).toBe("");
    expect(parser.full()).toBe("");
  });

  it('respeita escapes JSON (\\n, \\", \\\\) mesmo com o marcador pretty', () => {
    const parser = createStreamingJsonFieldParser("draft_markdown");
    const raw = 'linha1\nlinha2 com "aspas" e \\barra\\';
    const payload = `{\n  "draft_markdown": "${JSON.stringify(raw).slice(1, -1)}"\n}`;

    parser.push(payload);

    expect(parser.full()).toBe(raw);
  });
});
