# syntax=docker/dockerfile:1

# ---------- 1. Dependências ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Verificação (portão de qualidade) ----------
# A imagem só é construída se tipos, análise estática e testes (cobertura >= 90%) passarem.
FROM deps AS verificacao
COPY . .
ENV NO_COLOR=1 CI=true
RUN npm run typecheck \
 && npm run lint \
 && npm run coverage

# ---------- 3. Build da interface React ----------
FROM verificacao AS build
RUN npx vite build

# ---------- 4. Execução: Nginx servindo os arquivos estáticos ----------
FROM nginx:1.27-alpine AS app
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
