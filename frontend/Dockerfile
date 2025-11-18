# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app
ENV ROLLUP_SKIP_NODE_NATIVE=true

ARG ROLLUP_LINUX_MUSL_VERSION=4.52.5

COPY frontend/package*.json ./
RUN npm ci && npm install --no-save @rollup/rollup-linux-x64-musl@${ROLLUP_LINUX_MUSL_VERSION}

COPY frontend/ ./
ARG VITE_APP_NAME="Thesis Wallet"
ARG VITE_APP_VERSION="dev"
ARG VITE_API_BASE_URL="http://localhost:8000"
ARG VITE_OIDC_ISSUER="http://localhost:8080/realms/thesis"
ARG VITE_OIDC_CLIENT_ID="frontend"
ARG VITE_OIDC_REDIRECT_URI="http://localhost:3000/auth/callback"
ARG VITE_OIDC_SILENT_REDIRECT_URI="http://localhost:3000/auth/silent-refresh"
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI="http://localhost:3000/"
ARG VITE_OIDC_SCOPE="openid profile email thesis-access"
ARG VITE_ENABLE_MOCKED_AUTH=""
ENV \
  VITE_APP_NAME="$VITE_APP_NAME" \
  VITE_APP_VERSION="$VITE_APP_VERSION" \
  VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  VITE_OIDC_ISSUER="$VITE_OIDC_ISSUER" \
  VITE_OIDC_CLIENT_ID="$VITE_OIDC_CLIENT_ID" \
  VITE_OIDC_REDIRECT_URI="$VITE_OIDC_REDIRECT_URI" \
  VITE_OIDC_SILENT_REDIRECT_URI="$VITE_OIDC_SILENT_REDIRECT_URI" \
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI="$VITE_OIDC_POST_LOGOUT_REDIRECT_URI" \
  VITE_OIDC_SCOPE="$VITE_OIDC_SCOPE" \
  VITE_ENABLE_MOCKED_AUTH="$VITE_ENABLE_MOCKED_AUTH"
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY infra/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ || exit 1
