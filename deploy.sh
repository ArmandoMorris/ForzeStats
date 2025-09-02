#!/bin/bash

# Скрипт развертывания ForzeStats на VPS
# Использование: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="forzestats"
DOCKER_REGISTRY=""

echo "🚀 Развертывание ForzeStats на VPS..."
echo "📍 Окружение: $ENVIRONMENT"
echo "🏷️  Проект: $PROJECT_NAME"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и Docker Compose."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose."
    exit 1
fi

echo "✅ Docker и Docker Compose найдены"

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down --remove-orphans || true

# Удаляем старые образы
echo "🧹 Очищаем старые образы..."
docker system prune -f

# Собираем новые образы
echo "🔨 Собираем Docker образы..."
docker-compose build --no-cache

# Запускаем сервисы
echo "🚀 Запускаем сервисы..."
docker-compose up -d

# Ждем запуска сервисов
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус
echo "🔍 Проверяем статус сервисов..."
docker-compose ps

# Проверяем доступность
echo "🌐 Проверяем доступность сервисов..."

# Проверяем бэкенд
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Бэкенд доступен на порту 3001"
else
    echo "❌ Бэкенд недоступен на порту 3001"
fi

# Проверяем фронтенд
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Фронтенд доступен на порту 80"
else
    echo "❌ Фронтенд недоступен на порту 80"
fi

echo ""
echo "🎉 Развертывание завершено!"
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "🌐 Доступ к приложению:"
echo "   Фронтенд: http://localhost (или IP вашего VPS)"
echo "   Бэкенд API: http://localhost:3001"
echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Остановка: docker-compose down"
echo "   Перезапуск: docker-compose restart"
echo "   Обновление: ./deploy.sh $ENVIRONMENT"
