# Stage 1: Build Frontend and Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root dependencies and build backend
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY scripts/ ./scripts/
RUN npx tsc -b

# Copy client dependencies and build frontend bundle
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled backend and frontend dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/src/db/files ./dist/db/files
COPY --from=builder /app/src/services/workflow/journeyConfigs ./dist/services/workflow/journeyConfigs

# Run as unprivileged non-root user
USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
