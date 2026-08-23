// Word-level diff (LCS-based) — usado pra pintar "aceitar/rejeitar" inline
// depois de uma iteração. Implementação in-house pra não puxar diff-match-patch
// (bloqueado por permissão do node_modules; e pra este caso de uso não precisamos
// da granularidade do google — só um diff legível por palavra).
//
// Complexidade: O(n·m) tempo e espaço. Pro caso de uso (seção de peça, ~200-500
// palavras) é irrelevante. Se um dia isso virar gargalo, trocar por Myers O(nd).

export type DiffOp = "eq" | "del" | "ins";

export interface DiffChunk {
  op: DiffOp;
  text: string;
}

/** Tokeniza preservando whitespace como token próprio, pra que a saída
 *  reconstrua o texto sem perda quando concatenada. */
function tokenize(s: string): string[] {
  const tokens: string[] = [];
  const re = /\s+|[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) tokens.push(m[0]);
  return tokens;
}

/** Retorna operações que transformam `a` em `b`, agrupadas por op consecutivo. */
export function wordDiff(a: string, b: string): DiffChunk[] {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length;
  const m = B.length;

  // Matriz LCS: dp[i][j] = tamanho da LCS de A[i:] e B[j:].
  const dp: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i] === B[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffChunk[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      pushOp(ops, "eq", A[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushOp(ops, "del", A[i]);
      i++;
    } else {
      pushOp(ops, "ins", B[j]);
      j++;
    }
  }
  while (i < n) pushOp(ops, "del", A[i++]);
  while (j < m) pushOp(ops, "ins", B[j++]);
  return ops;
}

function pushOp(ops: DiffChunk[], op: DiffOp, text: string): void {
  const last = ops[ops.length - 1];
  if (last && last.op === op) last.text += text;
  else ops.push({ op, text });
}
