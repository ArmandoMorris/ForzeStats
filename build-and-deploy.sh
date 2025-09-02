#!/bin/bash

# Скрипт для локальной сборки и загрузки на VPS
# Использование: ./build-and-deploy.sh [VPS_IP] [production|staging]

set -e

VPS_IP=${1:-"your_vps_ip"}
ENVIRONMENT=${2:-"production"}
PROJECT_NAME="forzestats"

echo "🚀 Локальная сборка и загрузка ForzeStats на VPS..."
echo "📍 VPS IP: $VPS_IP"
echo "🏷️  Окружение: $ENVIRONMENT"
echo "🏷️  Проект: $PROJECT_NAME"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен локально. Установите Docker Desktop для Windows."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен локально."
    exit 1
fi

echo "✅ Docker и Docker Compose найдены локально"

# Собираем фронтенд локально
echo "🔨 Собираем фронтенд локально..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Папка dist не найдена. Сборка фронтенда не удалась."
    exit 1
fi

echo "✅ Фронтенд собран локально"

# Собираем Docker образы локально
echo "🐳 Собираем Docker образы локально..."

# Собираем фронтенд образ
echo "📦 Собираем образ фронтенда..."
docker build -f Dockerfile.frontend -t forzestats-frontend:latest .

# Собираем бэкенд образ
echo "📦 Собираем образ бэкенда..."
docker build -f Dockerfile.backend -t forzestats-backend:latest .

echo "✅ Docker образы собраны локально"

# Сохраняем образы в tar файлы
echo "💾 Сохраняем образы в tar файлы..."
docker save forzestats-frontend:latest -o forzestats-frontend.tar
docker save forzestats-backend:latest -o forzestats-backend.tar

echo "✅ Образы сохранены в tar файлы"

# Загружаем образы на VPS
echo "📤 Загружаем образы на VPS $VPS_IP..."

# Копируем файлы на VPS
echo "📁 Копируем файлы проекта..."
scp -r . $VPS_IP:/tmp/forzestats-deploy/

# Копируем образы
echo "📦 Копируем Docker образы..."
scp forzestats-frontend.tar $VPS_IP:/tmp/forzestats-deploy/
scp forzestats-backend.tar $VPS_IP:/tmp/forzestats-deploy/

# Подключаемся к VPS и развертываем
echo "🔌 Подключаемся к VPS и развертываем..."
ssh $VPS_IP << 'EOF'
    cd /tmp/forzestats-deploy
    
    # Останавливаем существующие контейнеры
    echo "🛑 Останавливаем существующие контейнеры..."
    docker-compose down --remove-orphans || true
    
    # Загружаем образы
    echo "📥 Загружаем Docker образы..."
    docker load -i forzestats-frontend.tar
    docker load -i forzestats-backend.tar
    
    # Запускаем сервисы
    echo "🚀 Запускаем сервисы..."
    docker-compose up -d
    
    # Ждем запуска
    echo "⏳ Ждем запуска сервисов..."
    sleep 10
    
    # Проверяем статус
    echo "🔍 Проверяем статус сервисов..."
    docker-compose ps
    
    # Проверяем доступность
    echo "🌐 Проверяем доступность сервисов..."
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Бэкенд доступен на порту 3001"
    else
        echo "❌ Бэкенд недоступен на порту 3001"
    fi
    
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
    
    # Очищаем временные файлы
    echo "🧹 Очищаем временные файлы..."
    rm -rf /tmp/forzestats-deploy
EOF

# Очищаем локальные tar файлы
echo "🧹 Очищаем локальные tar файлы..."
rm forzestats-frontend.tar forzestats-backend.tar

echo ""
echo "🎉 Развертывание завершено!"
echo "🌐 Приложение доступно на VPS: http://$VPS_IP"
echo ""
echo "📝 Полезные команды для VPS:"
echo "   Подключение: ssh $VPS_IP"
echo "   Статус: docker-compose ps"
echo "   Логи: docker-compose logs -f"
echo "   Остановка: docker-compose down"
