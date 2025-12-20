# =======================================================
# STAGE 1: Build dependencies
# =======================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas package files para cache de layers
COPY package*.json ./

# Install dependencies (com cache)
RUN npm ci --only=production && \
    npm cache clean --force

# =======================================================
# STAGE 2: Production image
# =======================================================
FROM node:20-alpine

# Labels para metadata
LABEL maintainer="jondevsouza31"
LABEL version="3.0.6"
LABEL description="API ADB WhatsApp - Sistema híbrido Redis + Supabase + Hot Reload"

# Instala ADB e ferramentas necessárias
RUN apk add --no-cache \
    android-tools \
    bash \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Configura timezone
ENV TZ=America/Sao_Paulo

WORKDIR /app

# Copia dependências do stage builder (usa usuário node que já existe)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copia código da aplicação
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

# Define variáveis de ambiente padrão (podem ser sobrescritas)
ENV NODE_ENV=production \
    PORT=8080 \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    BASE_WIDTH=720 \
    BASE_HEIGHT=1600 \
    POLLING_INTERVAL=1500 \
    HEALTH_CHECK_INTERVAL=30000 \
    NOTIFICATION_INTERVAL=3000

# Expõe porta da API
EXPOSE 8080

# Healthcheck para Docker/Kubernetes
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Muda para usuário não-root (node já existe na imagem base)
USER node

# Inicia ADB server e aplicação
CMD ["sh", "-c", "adb start-server && node src/server.js"]
