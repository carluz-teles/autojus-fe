# syntax=docker/dockerfile:1

# Next.js standalone build (docs/app/api-reference/config/next-config-js/output).
# NEXT_PUBLIC_* são embutidas no bundle do CLIENTE em tempo de BUILD — diferente de
# CLERK_SECRET_KEY (só server, lida em runtime). Por isso entram como ARG e viram
# ENV só durante o `next build`; o Railway injeta as runtime vars (CLERK_SECRET_KEY)
# separadamente, sem precisar delas aqui.

# ---- deps: instala dependências isoladas (cache até package*.json mudar) ------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compila com as NEXT_PUBLIC_* do momento do build -----------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL}
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# CLERK_SECRET_KEY não é necessária no build (só as rotas de servidor a usam em
# runtime), mas o SDK do Clerk falha cedo se a env estiver ausente na hora do
# build — um placeholder evita isso sem vazar segredo real na imagem.
ENV CLERK_SECRET_KEY=sk_test_build_placeholder

RUN npm run build

# ---- runner: só o output standalone + estáticos, non-root --------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["node", "server.js"]
