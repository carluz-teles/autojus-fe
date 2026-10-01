import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

export async function fixtureModuleURL(file, dependencies = {}) {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const ts = require("typescript");
  const source = await fs.readFile(
    `src/features/curation/__tests__/${file}.ts`,
    "utf8",
  );
  let code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  for (const [name, url] of Object.entries(dependencies))
    code = code.replaceAll(JSON.stringify(name), JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}
