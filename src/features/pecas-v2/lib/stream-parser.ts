// stream-parser.ts — extrator incremental de um campo string dentro do JSON
// streaming do LLM. O worker-ai publica deltas brutos do content JSON
// (`{"draft_markdown":"## I ...`) via SSE; este parser mantém buffer, procura
// a abertura do campo, e emite os pedaços já unescapados à medida que chegam.
//
// Independente do formato do valor (markdown, HTML, texto). O consumer decide
// o que fazer com o buffer acumulado (converter markdown → HTML, aplicar no
// editor, etc). Suporta os escapes JSON principais: \" \\ \/ \n \r \t \b \f
// \uXXXX. Não valida o JSON inteiro — é permissivo por design (o BE já fez
// schema strict; aqui é só extração progressiva do valor).

interface StreamingFieldParser {
  /** Consome um chunk bruto do SSE. Devolve o delta novo (só o texto novo). */
  push(chunk: string): string;
  /** Devolve o valor completo acumulado até agora. */
  full(): string;
}

const enum State {
  BeforeField,
  InValue,
  Done,
}

/** Cria um parser stateful pra extrair o valor de um campo string do JSON
 *  streaming. Não é thread-safe (cada request tem o seu). O `fieldName`
 *  default reflete o schema atual da geração (`draft_markdown`, v8+). */
export function createStreamingJsonFieldParser(
  fieldName = "draft_markdown",
): StreamingFieldParser {
  const openMarker = `"${fieldName}":"`; // "draft_html":"
  let state: State = State.BeforeField;
  let buffer = ""; // caracteres brutos ainda não processados
  let fullHtml = ""; // HTML acumulado (unescapado)
  let inEscape = false; // último char foi \ dentro do value

  return {
    push(chunk: string): string {
      buffer += chunk;

      if (state === State.BeforeField) {
        const idx = buffer.indexOf(openMarker);
        if (idx < 0) return ""; // ainda não abriu
        buffer = buffer.slice(idx + openMarker.length);
        state = State.InValue;
      }

      if (state !== State.InValue) return "";

      // Consome o buffer caractere a caractere respeitando escapes JSON.
      let out = "";
      let i = 0;
      while (i < buffer.length) {
        const ch = buffer[i];

        if (inEscape) {
          switch (ch) {
            case '"':
            case "\\":
            case "/":
              out += ch;
              break;
            case "n":
              out += "\n";
              break;
            case "r":
              out += "\r";
              break;
            case "t":
              out += "\t";
              break;
            case "b":
              out += "\b";
              break;
            case "f":
              out += "\f";
              break;
            case "u": {
              // precisa 4 hex — se não completos ainda, deixa pra próxima
              if (i + 4 >= buffer.length) {
                inEscape = true; // reverte pro estado com \ ainda pendente
                buffer = "\\" + buffer.slice(i);
                fullHtml += out;
                return out;
              }
              const hex = buffer.slice(i + 1, i + 5);
              out += String.fromCharCode(parseInt(hex, 16));
              i += 4;
              break;
            }
            default:
              // escape desconhecido: emite literal
              out += "\\" + ch;
          }
          inEscape = false;
          i++;
          continue;
        }

        if (ch === "\\") {
          if (i === buffer.length - 1) {
            // \ no fim do buffer: aguarda próximo chunk pra ver que escape é
            buffer = buffer.slice(i);
            fullHtml += out;
            return out;
          }
          inEscape = true;
          i++;
          continue;
        }

        if (ch === '"') {
          // fim do value
          state = State.Done;
          buffer = "";
          fullHtml += out;
          return out;
        }

        out += ch;
        i++;
      }
      // consumiu tudo, sem fechar
      buffer = "";
      fullHtml += out;
      return out;
    },
    full(): string {
      return fullHtml;
    },
  };
}
