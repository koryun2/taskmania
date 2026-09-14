# ---- build ----
FROM node:24-alpine AS build

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so the API location has to be supplied
# here rather than when the container starts.
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine

COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
