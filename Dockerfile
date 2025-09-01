# Multi-stage build для оптимизации размера образа
FROM node:18-alpine AS base

# Устанавливаем зависимости для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Рабочая директория
WORKDIR /app

# Копируем package.json файлы
COPY package*.json ./
COPY server/package*.json ./server/

# Устанавливаем зависимости
RUN npm ci --only=production && \
    cd server && npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем фронтенд
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Устанавливаем зависимости для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Рабочая директория
WORKDIR /app

# Копируем зависимости и собранное приложение
COPY --from=base --chown=nextjs:nodejs /app/dist ./dist
COPY --from=base --chown=nextjs:nodejs /app/server ./server
COPY --from=base --chown=nextjs:nodejs /app/server/node_modules ./server/node_modules

# Переключаемся на пользователя
USER nextjs

# Открываем порт
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Запускаем сервер
CMD ["node", "server/server.js"]

