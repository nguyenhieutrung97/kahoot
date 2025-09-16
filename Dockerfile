# -----------------------------
# 1. Base deps
# -----------------------------
FROM node:20-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --no-audit --no-fund

# -----------------------------
# 2. Builder
# -----------------------------
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build for standalone output
RUN npm run build

# (Optional) quick visibility
RUN ls -la .next && ls -la .next/standalone || true && ls -la out || true

# Fail fast if standalone missing
RUN test -d ".next/standalone" || (echo "❌ .next/standalone not found. Ensure next.config.* has output:'standalone' and you are not running next export." && exit 1)

# Trim workspace (standalone bundles its own node_modules)
RUN rm -rf node_modules

# -----------------------------
# 3. Runner
# -----------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl

# Copy standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fs http://localhost:3000/ || exit 1

# In standalone output, server.js is at the copy root
CMD ["node", "server.js"]
