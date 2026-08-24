// stream-parser.ts — extrator incremental do campo `draft_html` do output
// streaming do LLM. O worker-ai publica cada delta bruto do content (JSON
// que vai ficando: `{"draft_html":"<p>...`). Este parser mantém buffer,
// procura a abertura do campo, e emite os pedaços de HTML já unescapados
// à medida que chegam.
//
// Contract:
//   const p = createHTMLStreamParser();
//   for each chunk from SSE:
//     const htmlDelta = p.push(chunk);
//     if (htmlDelta) appendToEditor(htmlDelta);
//
// Suporta os escapes JSON principais: \" \\ \/ \n \r \t \b \f \uXXXX.
// Não valida o JSON inteiro — é permissivo por design (o BE já fez schema
// strict; aqui é só extração progressiva do valor).

interface HTMLStreamParser {
  /** Recebe um chunk bruto, devolve o HTML novo (unescapado) a ser
   *  appended ao editor. "" quando ainda não abriu o campo ou nada novo. */
  push(chunk: string): string;
  /** Devolve o HTML completo acumulado (útil pra sync final). */
  full(): string;
}

const enum State {
  BeforeField,
  InValue,
  Done,
}

/** Cria um parser stateful. Não é thread-safe (cada request tem o seu). */
export function createHTMLStreamParser(fieldName = "draft_html"): HTMLStreamParser {
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
