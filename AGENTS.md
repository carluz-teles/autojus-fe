<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QA: servidor de desenvolvimento

O QA DEVE sempre matar qualquer processo de dev existente antes de iniciar a validação no browser, e iniciar um servidor novo. Motivo: se um `next dev` (ou `next start`) já estiver rodando, o Next sobe o novo em outra porta (ex.: :3001), que tem problema de CORS com o backend. O app DEVE rodar em :3000.

Procedimento obrigatório do QA:

1. Matar todos os processos de dev/servidor existentes nas portas 3000 e 3001 (ex.: `fuser -k 3000/tcp 3001/tcp` ou `kill` nos pids encontrados por `ss -ltnp`/`ps`).
2. Iniciar um dev server novo no foreground/background (script `dev` do package.json) e confirmar que está escutando em :3000.
3. Navegar no browser para `http://localhost:3000/processos` (nunca :3001).
4. Não tentar autenticar no backend (Clerk) — falta de sessão mostra erro/vazio de dados, o que é esperado e não é falha do change.
