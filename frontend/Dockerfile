# Frontend production image (Vite build + Nginx serve)
FROM node:20-alpine AS build
WORKDIR /app
# Allow passing API URL at build time for Vite (e.g., --build-arg VITE_API_URL=https://app.example.com)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
