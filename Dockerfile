# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Install system dependencies for native builds if needed
RUN apk add --no-cache libc6-compat postgresql-client

# Install all dependencies (including devDependencies for building)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Builder stage: compiles backend and builds Vue 3 frontend
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build:ui
RUN npm run build:backend

# Production runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

# Copy built artifacts and runtime dependencies
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3001

CMD ["npx", "tsx", "src/framework/server.ts"]
