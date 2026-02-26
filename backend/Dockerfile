FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Use non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app .

USER appuser

# Workers do not bind to a web port dynamically under railway
CMD ["node", "worker.js"]
