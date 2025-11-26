FROM node:20-alpine AS build

WORKDIR /app

# Принимаем переменные окружения как build arguments
ARG VITE_API_BASE_URL=/api/v1

# Устанавливаем переменные окружения для процесса сборки Vite
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

