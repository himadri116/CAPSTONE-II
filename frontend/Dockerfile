# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_BASE_URL=http://localhost:8001
ARG VITE_ENABLE_LOCAL_CACHE_MODE=true
ARG VITE_ENABLE_HISTORY_DELETE=true
ARG VITE_AUTH_API_URL=http://localhost:5000
ARG VITE_GOOGLE_CLIENT_ID=402610411923-g3r7t82ht7tes01ofn6a838tsb1oct64.apps.googleusercontent.com

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ENABLE_LOCAL_CACHE_MODE=$VITE_ENABLE_LOCAL_CACHE_MODE
ENV VITE_ENABLE_HISTORY_DELETE=$VITE_ENABLE_HISTORY_DELETE
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the production bundle
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
