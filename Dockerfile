# Stage 1: build backend (tsc) and the integration-stub UI (Vite)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY client/package*.json ./client/
RUN npm --prefix client ci

COPY tsconfig.json ./
COPY src ./src
COPY client ./client
RUN npx tsc -p tsconfig.json && npm --prefix client run build

# Stage 2: minimal runtime, production dependencies only, non-root
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000 \
    CSV_DATA_DIR=/app/dist/db/files \
    AUDIT_LOG_PATH=/app/data/audit-ledger.jsonl \
    CONSENT_KEY_FILE=/app/data/consent-signing-key.pem

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY src/db/files ./dist/db/files
COPY src/services/workflow/journeyConfigs ./dist/services/workflow/journeyConfigs
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
