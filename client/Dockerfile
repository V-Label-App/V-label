# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code (excluding .env files via .dockerignore)
COPY . .

# Copy the .env.docker file created by GitHub Actions and rename to .env
# This file contains all VITE_* variables with correct values
COPY .env.docker .env

# DEBUG: Print .env content to verify no duplicates
RUN echo "=== DEBUG: .env file content ===" && \
    cat .env && \
    echo "=== END DEBUG ==="

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
