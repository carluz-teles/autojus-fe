// @vitest-environment jsdom
//
// S2 — INTEGRAÇÃO real: QueryClient/hooks reais (usePipelineCounts, o mesmo
// hook de produção) + useCapturaBoundedRefetch (também real) + fetcher
// mockado, exatamente como use-triagem-pipeline.ts compõe os dois. Prova o
// que o teste unitário puro de useCapturaBoundedRefetch NÃO prova sozinho:
// que a integração com o React Query de verdade dispara requisições de rede
// reais enquanto ativo, para no terminal com UMA busca extra, e desliga de
// vez — não é só uma flag calculada corretamente.
//
// Timers REAIS (não fake): `vi.useFakeTimers()` + o agendamento interno do
// @tanstack/react-query nesta versão não convivem (advanceTimersByTimeAsync
// trava — tentado e revertido; limitação registrada no handoff, não
// escondida). Segue o padrão JÁ estabelecido no repo
// (peca-gate-modal.test.tsx: QueryClient real + fetcher mockado + esperas
// reais pequenas) — os intervalos usados aqui são símbolos curtos (30ms), não
// os valores de produção (4s/10min), que já são cobertos com precisão pelo
// teste unitário de useCapturaBoundedRefetch (fake timers, sem QueryClient).
//
// Escopo assumido (honesto): testado contra `usePipelineCounts` (useQuery
// simples). `useIntimacoes` (a lista, useInfiniteQuery) usa a MESMA opção
// `refetchInterval` do React Query — não dupliquei aqui por ser uma infra
// mais pesada (paginação por cursor) sem sinal de que o comportamento diverge
// entre useQuery/useInfiniteQuery nesta versão da lib.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import {
  useIntimacoes,
  usePipelineCounts,
} from "../../intimacoes/hooks/use-intimacoes";
import type { TriagemBucketCounts } from "../../intimacoes/types";
import { useCapturaBoundedRefetch } from "./use-captura-bounded-refetch";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));

const TICK_MS = 30;
const STALL_MS = 1_000_000; // nunca atingido nestes testes (não é o alvo aqui)

function counts(
  overrides: Partial<TriagemBucketCounts> = {},
): TriagemBucketCounts {
  return {
    a_triar: 1,
    em_andamento: 0,
    concluido: 0,
    analisando: 0,
    trabalho: 1,
    excecao: 0,
    ciencia: 0,
    sem_prazo: 0,
    ...overrides,
  };
}

let activeProp = false;
let latestCount = -1;
let latestListTotal = -1;
// Mesma indireção por ref que use-triagem-pipeline.ts usa em produção:
// `pipeline` só existe DEPOIS da chamada de useCapturaBoundedRefetch, então o
// refetch-na-transição passa por uma ref atualizada em efeito (nunca durante
// o render — react-hooks/refs).
function Probe({ onTerminal }: { onTerminal: () => void }) {
  const refetchRef = useRef<() => void>(() => {});
  const { pollIntervalMs } = useCapturaBoundedRefetch(
    activeProp,
    TICK_MS,
    STALL_MS,
    () => {
      onTerminal();
      refetchRef.current();
    },
  );
  const pipeline = usePipelineCounts({}, true, pollIntervalMs);
  useEffect(() => {
    refetchRef.current = () => void pipeline.refetch();
  });
  useEffect(() => {
    latestCount = pipeline.counts.a_triar;
  });
  return null;
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((done) => setTimeout(done, ms));
  });
}

describe("S2 integração — usePipelineCounts real + useCapturaBoundedRefetch real", () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;
  let onTerminal: Mock<() => void>;

  async function render() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe, { onTerminal }),
        ),
      );
    });
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    onTerminal = vi.fn<() => void>();
    activeProp = false;
    latestCount = -1;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("ativo: o React Query de verdade refaz a busca em ticks sucessivos do intervalo (não só uma flag)", async () => {
    mocks.fetch.mockResolvedValue(counts({ a_triar: 1 }));
    activeProp = true;
    await render();
    await wait(5);
    expect(mocks.fetch).toHaveBeenCalledTimes(1); // fetch inicial

    mocks.fetch.mockResolvedValue(counts({ a_triar: 2 }));
    await wait(TICK_MS + 20);
    expect(mocks.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(latestCount).toBe(2);
  });

  it("transição terminal: refetch FINAL único capta a última mudança sem depender do próximo tick", async () => {
    mocks.fetch.mockResolvedValue(counts({ a_triar: 1 }));
    activeProp = true;
    await render();
    await wait(5);
    const callsBeforeTerminal = mocks.fetch.mock.calls.length;

    // resultado final real, publicado exatamente no instante da transição —
    // sem o refetch de transição, só apareceria no próximo tick do intervalo.
    mocks.fetch.mockResolvedValue(counts({ a_triar: 0 }));
    activeProp = false;
    await render();
    await wait(10);

    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls.length).toBe(callsBeforeTerminal + 1);
    expect(latestCount).toBe(0);
  });

  it("depois do terminal: nenhuma busca nova mesmo esperando bem além do intervalo (auto-off real)", async () => {
    mocks.fetch.mockResolvedValue(counts());
    activeProp = true;
    await render();
    await wait(5);
    activeProp = false;
    await render();
    await wait(10);
    const callsAtTerminal = mocks.fetch.mock.calls.length;

    await wait(TICK_MS * 6);
    expect(mocks.fetch.mock.calls.length).toBe(callsAtTerminal);
  });

  it("unmount durante o poll ativo não deixa nenhuma busca disparando depois (sem vazamento)", async () => {
    mocks.fetch.mockResolvedValue(counts());
    activeProp = true;
    await render();
    await wait(5);
    const callsBeforeUnmount = mocks.fetch.mock.calls.length;

    await act(async () => root.unmount());
    await new Promise((done) => setTimeout(done, TICK_MS * 6));
    expect(mocks.fetch.mock.calls.length).toBe(callsBeforeUnmount);
  });
});

// list+counts COHERENCE — the counts block above deliberately deferred the list
// (useInfiniteQuery). This proves the gap the task named: use-triagem-pipeline.ts
// passes the SAME `pollIntervalMs` into BOTH useIntimacoes (list) and
// usePipelineCounts (counts), so they poll together, do the single terminal
// refetch together, and stop together — the list can never stay stuck on a stale
// page while the badges advance (or vice-versa). One fetcher, discriminated by
// endpoint, mirrors the real two-surface wiring.
const LIST_ENDPOINT = "/v1/intimacoes";
const COUNTS_ENDPOINT = "/v1/intimacoes/pipeline-counts";

describe("S2 integração — lista (useIntimacoes) + counts coerentes no MESMO sinal bounded", () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;
  let onTerminal: Mock<() => void>;
  let countA = 0;
  let listTotal = 0;

  const callsTo = (endpoint: string) =>
    mocks.fetch.mock.calls.filter((c) => String(c[0]) === endpoint).length;

  function ProbeBoth() {
    const refetchRef = useRef<() => void>(() => {});
    const { pollIntervalMs } = useCapturaBoundedRefetch(
      activeProp,
      TICK_MS,
      STALL_MS,
      () => {
        onTerminal();
        refetchRef.current();
      },
    );
    const list = useIntimacoes({
      enabled: true,
      limit: 50,
      refetchIntervalMs: pollIntervalMs,
    });
    const pipeline = usePipelineCounts({}, true, pollIntervalMs);
    useEffect(() => {
      refetchRef.current = () => {
        void list.refetch();
        void pipeline.refetch();
      };
    });
    useEffect(() => {
      latestCount = pipeline.counts.a_triar;
      latestListTotal = list.totalCount;
    });
    return null;
  }

  async function render() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(ProbeBoth),
        ),
      );
    });
  }

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    mocks.fetch.mockImplementation((endpoint: string) =>
      Promise.resolve(
        String(endpoint) === COUNTS_ENDPOINT
          ? counts({ a_triar: countA })
          : {
              data: [],
              page: { next_cursor: "", limit: 50, total_count: listTotal },
            },
      ),
    );
    onTerminal = vi.fn<() => void>();
    activeProp = false;
    latestCount = -1;
    latestListTotal = -1;
    countA = 0;
    listTotal = 0;
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("ativo: lista E counts refazem a busca nos ticks do MESMO intervalo (as duas, não só as counts)", async () => {
    countA = 1;
    listTotal = 10;
    activeProp = true;
    await render();
    await wait(5);
    expect(callsTo(LIST_ENDPOINT)).toBeGreaterThanOrEqual(1);
    expect(callsTo(COUNTS_ENDPOINT)).toBeGreaterThanOrEqual(1);

    countA = 2;
    listTotal = 20;
    await wait(TICK_MS + 20);
    expect(callsTo(LIST_ENDPOINT)).toBeGreaterThanOrEqual(2);
    expect(callsTo(COUNTS_ENDPOINT)).toBeGreaterThanOrEqual(2);
    expect(latestCount).toBe(2);
    expect(latestListTotal).toBe(20);
  });

  it("transição terminal: UM refetch final atinge lista E counts, depois AS DUAS param (coerência)", async () => {
    countA = 1;
    listTotal = 10;
    activeProp = true;
    await render();
    await wait(5);
    const listBefore = callsTo(LIST_ENDPOINT);
    const countsBefore = callsTo(COUNTS_ENDPOINT);

    // resultado final publicado no instante da transição
    countA = 0;
    listTotal = 0;
    activeProp = false;
    await render();
    await wait(10);
    expect(onTerminal).toHaveBeenCalledTimes(1);
    expect(callsTo(LIST_ENDPOINT)).toBe(listBefore + 1);
    expect(callsTo(COUNTS_ENDPOINT)).toBe(countsBefore + 1);
    expect(latestListTotal).toBe(0);
    expect(latestCount).toBe(0);

    const listAtTerminal = callsTo(LIST_ENDPOINT);
    const countsAtTerminal = callsTo(COUNTS_ENDPOINT);
    await wait(TICK_MS * 6);
    expect(callsTo(LIST_ENDPOINT)).toBe(listAtTerminal);
    expect(callsTo(COUNTS_ENDPOINT)).toBe(countsAtTerminal);
  });
});
