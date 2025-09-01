#!/bin/bash

# FORZE Stats - Скрипт запуска
# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 FORZE Stats - Запуск приложения${NC}"
echo "=================================="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен. Установите Node.js 18+${NC}"
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Требуется Node.js версии 18 или выше. Текущая версия: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js версии $(node -v) найден${NC}"

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не установлен${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm найден${NC}"

# Функция для установки зависимостей
install_dependencies() {
    echo -e "${YELLOW}📦 Устанавливаем зависимости...${NC}"
    
    # Устанавливаем зависимости фронтенда
    if [ ! -d "node_modules" ]; then
        echo "Устанавливаем зависимости фронтенда..."
        npm install
    else
        echo "Зависимости фронтенда уже установлены"
    fi
    
    # Устанавливаем зависимости сервера
    if [ ! -d "server/node_modules" ]; then
        echo "Устанавливаем зависимости сервера..."
        cd server
        npm install
        cd ..
    else
        echo "Зависимости сервера уже установлены"
    fi
}

# Функция для запуска в режиме разработки
start_dev() {
    echo -e "${YELLOW}🔧 Запуск в режиме разработки...${NC}"
    
    # Запускаем сервер в фоне
    echo "Запускаем сервер..."
    cd server
    npm run dev &
    SERVER_PID=$!
    cd ..
    
    # Ждем немного для запуска сервера
    sleep 3
    
    # Проверяем, что сервер запустился
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✅ Сервер запущен на http://localhost:3001${NC}"
    else
        echo -e "${RED}❌ Ошибка запуска сервера${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    # Запускаем клиент
    echo "Запускаем клиент..."
    npm run dev &
    CLIENT_PID=$!
    
    echo -e "${GREEN}✅ Приложение запущено!${NC}"
    echo -e "${BLUE}📊 Сервер: http://localhost:3001${NC}"
    echo -e "${BLUE}🌐 Клиент: http://localhost:5173${NC}"
    echo ""
    echo -e "${YELLOW}Для остановки нажмите Ctrl+C${NC}"
    
    # Ожидаем сигнала завершения
    trap 'echo -e "\n${YELLOW}🛑 Останавливаем приложение...${NC}"; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0' INT TERM
    wait
}

# Функция для запуска в production режиме
start_prod() {
    echo -e "${YELLOW}🚀 Запуск в production режиме...${NC}"
    
    # Собираем фронтенд
    echo "Собираем фронтенд..."
    npm run build
    
    # Запускаем сервер
    echo "Запускаем сервер..."
    cd server
    npm start
}

# Функция для запуска с Docker
start_docker() {
    echo -e "${YELLOW}🐳 Запуск с Docker...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker не установлен${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose не установлен${NC}"
        exit 1
    fi
    
    echo "Собираем и запускаем контейнеры..."
    docker-compose up --build -d
    
    echo -e "${GREEN}✅ Приложение запущено в Docker!${NC}"
    echo -e "${BLUE}🌐 Доступно по адресу: http://localhost${NC}"
}

# Функция для остановки Docker
stop_docker() {
    echo -e "${YELLOW}🛑 Останавливаем Docker контейнеры...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Контейнеры остановлены${NC}"
}

# Функция для очистки
clean() {
    echo -e "${YELLOW}🧹 Очистка...${NC}"
    
    # Удаляем node_modules
    if [ -d "node_modules" ]; then
        echo "Удаляем node_modules..."
        rm -rf node_modules
    fi
    
    if [ -d "server/node_modules" ]; then
        echo "Удаляем server/node_modules..."
        rm -rf server/node_modules
    fi
    
    # Удаляем dist
    if [ -d "dist" ]; then
        echo "Удаляем dist..."
        rm -rf dist
    fi
    
    echo -e "${GREEN}✅ Очистка завершена${NC}"
}

# Показываем меню
show_menu() {
    echo ""
    echo -e "${BLUE}Выберите режим запуска:${NC}"
    echo "1) Режим разработки (dev)"
    echo "2) Production режим"
    echo "3) Docker"
    echo "4) Остановить Docker"
    echo "5) Установить зависимости"
    echo "6) Очистка"
    echo "7) Выход"
    echo ""
    read -p "Введите номер (1-7): " choice
}

# Основной цикл
while true; do
    show_menu
    
    case $choice in
        1)
            install_dependencies
            start_dev
            break
            ;;
        2)
            install_dependencies
            start_prod
            break
            ;;
        3)
            start_docker
            break
            ;;
        4)
            stop_docker
            break
            ;;
        5)
            install_dependencies
            ;;
        6)
            clean
            ;;
        7)
            echo -e "${GREEN}👋 До свидания!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Неверный выбор. Попробуйте снова.${NC}"
            ;;
    esac
done

