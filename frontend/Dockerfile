# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app/frontend

# Install dependencies first to leverage Docker cache
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build the production bundle
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80