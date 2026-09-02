import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos de design handoff (JS/HTML vendored) — não é código-fonte do app.
    "docs/**",
    // Assets estáticos vendored (ex.: worker minificado do pdf.js) — não é fonte.
    "public/**",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // Imports: ordenação/agrupamento determinístico + linha em branco entre grupos.
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "no-duplicate-imports": "error",

      // Tipos: importa `type` separado; barra vars/params não usados (permite prefixo _).
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Funções / estilo.
      "arrow-body-style": ["error", "as-needed"],
      "prefer-const": "error",
      "object-shorthand": "error",
      eqeqeq: ["error", "smart"],

      // React Compiler check (react-hooks): downgrade das regras "in-effect"/
      // "immutability" pra warn. O compiler é conservador com setState em
      // useEffect (reset ao trocar prop, disparo idempotente via ref etc são
      // padrões legítimos) e com libs externas (React Hook Form retorna funções
      // não memoizáveis by design). Warn deixa o sinal visível mas não bloqueia
      // a CI — cada callsite tem racional documentado inline.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },

  // DEVE ser o último: desliga as regras de formatação do ESLint que conflitam com o Prettier.
  eslintConfigPrettier,
]);

export default eslintConfig;
