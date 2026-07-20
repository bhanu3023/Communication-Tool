# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Vite bakes VITE_* env vars at build time.
ARG VITE_API_BASE_URL
ARG VITE_AZURE_TENANT_ID
ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_REDIRECT_URI
ARG VITE_DEV_LOGIN
ARG VITE_SPEAKING_AUDIO
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID \
    VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    VITE_AZURE_REDIRECT_URI=$VITE_AZURE_REDIRECT_URI \
    VITE_DEV_LOGIN=$VITE_DEV_LOGIN \
    VITE_SPEAKING_AUDIO=$VITE_SPEAKING_AUDIO

# Copy .npmrc first so legacy-peer-deps applies during install (msal-react peer range
# predates React 19). package-lock.json is copied when present for reproducible installs.
COPY package.json .npmrc ./
COPY package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
