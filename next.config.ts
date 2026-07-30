import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Há um pnpm-lock.yaml no diretório-pai; fixamos a raiz para o Next não inferir errado.
  turbopack: { root: path.resolve(".") },
  // Docker: só copia o server + as deps de produção rastreadas (sem node_modules inteiro).
  output: "standalone",
};

export default nextConfig;
