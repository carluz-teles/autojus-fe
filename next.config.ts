import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Há um pnpm-lock.yaml no diretório-pai; fixamos a raiz para o Next não inferir errado.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
