# Этап 1: Сборка приложения
FROM node:20-alpine AS build
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходный код и собираем проект с base = "/"
# (переопределяем базовый путь для работы в Docker на корне домена)
COPY . .
RUN npm run build -- --base=/

# Этап 2: Раздача через Nginx
FROM nginx:alpine

# Копируем наш кастомный конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранные файлы из первого этапа
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
