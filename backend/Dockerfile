FROM node:20-alpine

WORKDIR /app

# Install curl and Chromium for PDF generation
RUN apk add --no-cache curl chromium nss freetype fontconfig ttf-freefont harfbuzz

# Default path for puppeteer-core to find Chrome in this image
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Default Redis URL used when running in Docker Compose with a 'redis' service
ENV REDIS_URL=redis://redis:6379

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build time)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

EXPOSE 5000

CMD ["npm", "start"]
