# syntax=docker/dockerfile:1

# ---------- 1. Dependências ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Verificação (portão de qualidade) ----------
# Nenhuma imagem (API ou front) é gerada se tipos, lint, contraste ou testes falharem.
# Os testes de integração da API precisam de banco: rodam em `npm run docker:qualidade` e no CI.
FROM deps AS verificacao
COPY . .
ENV NO_COLOR=1 CI=true
RUN npm run typecheck \
 && npm run lint \
 && npm run contraste \
 && npm run coverage \
 && npm run test:ui \
 && touch /verificado

# ---------- 3. Build do front-end React ----------
FROM verificacao AS build
RUN npx vite build

# ---------- 4. Dependências de produção ----------
FROM node:24-alpine AS deps-producao
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- 5. API (Node.js + Fastify) ----------
FROM node:24-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=verificacao /verificado /verificado
COPY --from=deps-producao /app/node_modules ./node_modules
COPY package.json ./
COPY src/domain ./src/domain
COPY api/src ./api/src
COPY api/drizzle ./api/drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null || exit 1
CMD ["node", "--import", "tsx", "api/src/main.ts"]

# ---------- 6. Front-end: Nginx servindo o build e fazendo proxy de /api ----------
FROM nginx:1.27-alpine AS app
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
