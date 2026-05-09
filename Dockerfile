# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install only production dependencies after copying package metadata
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy only what is required to run the app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Production environment variables should be set in Azure Container Apps
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
