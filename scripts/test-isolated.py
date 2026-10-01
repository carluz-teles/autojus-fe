#!/usr/bin/env python3
"""Frontend checks in a temporary source copy without dotenv or outbound network."""

from pathlib import Path
import os
import base64
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {"node_modules", ".git", ".next", ".clerk", "coverage", "__pycache__", ".vercel"}


def excluded(directory, names):
    return [name for name in names if name in EXCLUDED or name.startswith(".env") or
            name.endswith((".pem", ".key", ".tsbuildinfo")) or (Path(directory) / name).is_symlink()]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "test"
    arguments = sys.argv[2:]
    commands = {
        "test": ["node", "node_modules/vitest/vitest.mjs", "run"],
        "typecheck": ["node", "node_modules/typescript/bin/tsc", "--noEmit"],
        "lint": ["node", "node_modules/eslint/bin/eslint.js"],
        "format": ["node", "node_modules/prettier/bin/prettier.cjs", "--check"],
        "build": ["node", "node_modules/next/dist/bin/next", "build"],
        "browser-curation": ["node", "scripts/qa/curation-browser.mjs"],
        "browser-feedback": ["node", "scripts/qa/curation-browser.mjs"],
        "browser-feedback-metrics": ["node", "scripts/qa/curation-browser.mjs"],
        "browser-feedback-queues": ["node", "scripts/qa/curation-browser.mjs"],
        "browser-rag": ["node", "scripts/qa/curation-browser.mjs"],
    }
    if mode not in commands:
        raise ValueError("use test, typecheck, lint, format, build, browser-curation, browser-feedback, browser-feedback-metrics, browser-feedback-queues, or browser-rag")
    environment = {key: os.environ[key] for key in ("PATH", "HOME", "LANG", "TMPDIR") if key in os.environ}
    environment.update({"NODE_ENV": "production" if mode == "build" else "test",
                        "NEXT_TELEMETRY_DISABLED": "1", "NEXT_PUBLIC_API_URL": "http://127.0.0.1:18080"})
    if mode.startswith("browser-"):
        if arguments:
            raise ValueError("browser checks have no arbitrary command arguments")
        playwright = Path(os.environ.get("OFFLINE_PLAYWRIGHT_DIR", "")).resolve(strict=True)
        chrome = Path(os.environ.get("OFFLINE_CHROME_BIN", "")).resolve(strict=True)
        if not (playwright / "test.mjs").is_file() or not chrome.is_file() or not os.access(chrome, os.X_OK):
            raise ValueError("cached Playwright and Chromium paths are required; no downloads")
        environment.update({"NODE_ENV": "development", "OFFLINE_PLAYWRIGHT_DIR": str(playwright), "OFFLINE_CHROME_BIN": str(chrome),
                            "QA_ARTIFACT_DIR": tempfile.mkdtemp(prefix="atjud-curation-browser-"),
                            "QA_BROWSER_SUITE": mode.removeprefix("browser-")})
        print("Synthetic browser artifacts:", environment["QA_ARTIFACT_DIR"], flush=True)
    with tempfile.TemporaryDirectory(prefix="atjud-frontend-") as directory:
        source = Path(directory) / "app"
        shutil.copytree(ROOT, source, ignore=excluded)
        if mode == "build":
            # Turbopack refuses dependencies symlinked outside its filesystem
            # root. Hard links keep the copied project self-contained without
            # copying gigabytes or broadening the root to the private workspace.
            shutil.copytree(ROOT / "node_modules", source / "node_modules",
                            symlinks=True, copy_function=os.link)
            environment["NEXT_FONT_GOOGLE_MOCKED_RESPONSES"] = str(source / "scripts/fixtures/google-fonts.json")
            # Public, syntactically valid synthetic identifier for static build
            # only; no Clerk secret, token or reachable Clerk instance exists.
            environment["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] = "pk_test_" + base64.b64encode(b"clerk.synthetic.invalid$").decode()
        else:
            (source / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
        if mode.startswith("browser-"):
            # Auth replacement belongs ONLY to this disposable UI fixture. The
            # product proxy/layout/useApi are neither edited nor bypassed in place.
            (source / "src/proxy.ts").unlink()
            shutil.copyfile(source / "scripts/qa/curation-layout.tsx", source / "src/app/backoffice/layout.tsx")
            (source / "src/lib/api/use-api.ts").write_text('"use client";\nimport { apiFetch, apiFetchBinary } from "./client";\nexport type ApiFetcher = typeof apiFetch;\nexport function useApi() { return apiFetch; }\nexport type ApiBinaryFetcher = typeof apiFetchBinary;\nexport function useApiBinary() { return apiFetchBinary; }\n')
            environment["NEXT_FONT_GOOGLE_MOCKED_RESPONSES"] = str(source / "scripts/fixtures/google-fonts.json")
            if mode == "browser-feedback":
                page = source / "src/app/qa-feedback/page.tsx"
                page.parent.mkdir(parents=True)
                shutil.copyfile(source / "scripts/qa/feedback-page.tsx", page)
                page.write_text(page.read_text().replace('from "./feedback-auth"', 'from "@/qa-feedback-auth"'))
                shutil.copyfile(source / "scripts/qa/feedback-auth.ts", source / "src/qa-feedback-auth.ts")
                # Replace Clerk only in the disposable feedback feature. The
                # actual identity/transition checks and UI remain exercised.
                for rel in ("hooks/_private/use-feedback-identity.ts", "hooks/use-ai-feedback.ts"):
                    target = source / "src/features/ai-feedback" / rel
                    original = target.read_text()
                    if original.count('from "@clerk/nextjs"') != 1:
                        raise ValueError("feedback fixture auth import changed; inspect before running")
                    target.write_text(original.replace('from "@clerk/nextjs"', 'from "@/qa-feedback-auth"'))
        command = commands[mode] + (arguments or (["."] if mode in ("lint", "format") else []))
        isolated = ["unshare", "--user", "--map-root-user", "--net", "sh", "-c",
                    'ip link set lo up && exec "$@"', "frontend-check", *command]
        return subprocess.run(isolated, cwd=source, env=environment).returncode


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as error:
        print(f"isolated frontend check unavailable: {error}", file=sys.stderr)
        raise SystemExit(2)
