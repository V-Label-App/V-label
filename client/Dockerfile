# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

# Create .env file from build args using a script to avoid shell issues
# We use a script to cleaner handle the writes and avoid shell escaping hell
RUN echo "#!/bin/sh" > /tmp/create-env.sh && \
    echo "rm -f .env" >> /tmp/create-env.sh && \
    echo "touch .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_API_URL=${VITE_API_URL}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}\" >> .env" >> /tmp/create-env.sh && \
    echo "echo \"VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}\" >> .env" >> /tmp/create-env.sh && \
    chmod +x /tmp/create-env.sh && \
    /tmp/create-env.sh

# DEBUG: Print .env content to build logs to verify variables are present
RUN echo "=== DEBUG: .env content ===" && cat .env && echo "=== END DEBUG ==="

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
