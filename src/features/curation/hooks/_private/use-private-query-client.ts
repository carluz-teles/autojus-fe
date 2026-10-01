"use client";

import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function usePrivateQueryClient() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 0, gcTime: 0, retry: false },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  return client;
}
