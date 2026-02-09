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

# Create .env file from build args (Vite needs this file to exist!)
RUN printf "VITE_API_URL=%s\n" "${VITE_API_URL}" > .env && \
    printf "VITE_FIREBASE_API_KEY=%s\n" "${VITE_FIREBASE_API_KEY}" >> .env && \
    printf "VITE_FIREBASE_AUTH_DOMAIN=%s\n" "${VITE_FIREBASE_AUTH_DOMAIN}" >> .env && \
    printf "VITE_FIREBASE_PROJECT_ID=%s\n" "${VITE_FIREBASE_PROJECT_ID}" >> .env && \
    printf "VITE_FIREBASE_STORAGE_BUCKET=%s\n" "${VITE_FIREBASE_STORAGE_BUCKET}" >> .env && \
    printf "VITE_FIREBASE_MESSAGING_SENDER_ID=%s\n" "${VITE_FIREBASE_MESSAGING_SENDER_ID}" >> .env && \
    printf "VITE_FIREBASE_APP_ID=%s\n" "${VITE_FIREBASE_APP_ID}" >> .env && \
    printf "VITE_FIREBASE_MEASUREMENT_ID=%s\n" "${VITE_FIREBASE_MEASUREMENT_ID}" >> .env

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
