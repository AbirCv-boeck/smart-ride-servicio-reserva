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
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# ========================================
# Stage 3: Production
# ========================================
FROM node:22-alpine AS production

WORKDIR /app

# Copiar node_modules y código
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

# Crear directorio proto (se montará como volumen)
RUN mkdir -p /app/proto

# Usuario no privilegiado
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3002 50051

CMD ["node", "src/index.js"]
