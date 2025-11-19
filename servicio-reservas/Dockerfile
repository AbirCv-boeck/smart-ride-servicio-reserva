# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false && \
    npm cache clean --force

# ========================================
# Stage 2: Build (si fuera TypeScript, aquí iría)
# Para JavaScript puro, esta etapa es opcional
# ========================================
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# ========================================
# Stage 3: Production
# ========================================
FROM node:22-alpine AS production

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S smartride -u 1001 -G nodejs

# Instalar wget para healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copiar archivos necesarios
COPY --from=build --chown=smartride:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=smartride:nodejs /app/package*.json ./
COPY --from=build --chown=smartride:nodejs /app/src ./src

USER smartride

EXPOSE 3002

ENV NODE_ENV=production \
    PORT=3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "src/index.js"]
