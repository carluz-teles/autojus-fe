import path from "node:path";

import { defineConfig } from "vitest/config";

// Espelha o path alias de tsconfig.json ("@/*" → "./src/*"). Sem isso, `npm
// test` só funciona pra arquivos sem import "@/..." (o único teste existente
// até aqui, stream-parser.test.ts, não importava nada via alias — por isso
// o gap nunca apareceu). Zero dependência nova: `defineConfig` já vem com
// o vitest instalado.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
