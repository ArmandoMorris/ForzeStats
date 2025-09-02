# PowerShell скрипт для локальной сборки и загрузки на VPS
# Использование: .\build-and-deploy.ps1 [VPS_IP] [production|staging]

param(
    [string]$VPS_IP = "your_vps_ip",
    [string]$ENVIRONMENT = "production"
)

$PROJECT_NAME = "forzestats"

Write-Host "🚀 Локальная сборка и загрузка ForzeStats на VPS..." -ForegroundColor Green
Write-Host "📍 VPS IP: $VPS_IP" -ForegroundColor Yellow
Write-Host "🏷️  Окружение: $ENVIRONMENT" -ForegroundColor Yellow
Write-Host "🏷️  Проект: $PROJECT_NAME" -ForegroundColor Yellow

# Проверяем наличие Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker найден: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker не установлен локально. Установите Docker Desktop для Windows." -ForegroundColor Red
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose найден: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose не установлен локально." -ForegroundColor Red
    exit 1
}

# Собираем фронтенд локально
Write-Host "🔨 Собираем фронтенд локально..." -ForegroundColor Blue
npm run build

if (-not (Test-Path "dist")) {
    Write-Host "❌ Папка dist не найдена. Сборка фронтенда не удалась." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Фронтенд собран локально" -ForegroundColor Green

# Собираем Docker образы локально
Write-Host "🐳 Собираем Docker образы локально..." -ForegroundColor Blue

# Собираем фронтенд образ
Write-Host "📦 Собираем образ фронтенда..." -ForegroundColor Yellow
docker build -f Dockerfile.frontend -t "forzestats-frontend:latest" .

# Собираем бэкенд образ
Write-Host "📦 Собираем образ бэкенда..." -ForegroundColor Yellow
docker build -f Dockerfile.backend -t "forzestats-backend:latest" .

Write-Host "✅ Docker образы собраны локально" -ForegroundColor Green

# Сохраняем образы в tar файлы
Write-Host "💾 Сохраняем образы в tar файлы..." -ForegroundColor Blue
docker save forzestats-frontend:latest -o forzestats-frontend.tar
docker save forzestats-backend:latest -o forzestats-backend.tar

Write-Host "✅ Образы сохранены в tar файлы" -ForegroundColor Green

# Загружаем образы на VPS
Write-Host "📤 Загружаем образы на VPS $VPS_IP..." -ForegroundColor Blue

# Копируем файлы на VPS
Write-Host "📁 Копируем файлы проекта..." -ForegroundColor Yellow
scp -r . $VPS_IP:/tmp/forzestats-deploy/

# Копируем образы
Write-Host "📦 Копируем Docker образы..." -ForegroundColor Yellow
scp forzestats-frontend.tar $VPS_IP:/tmp/forzestats-deploy/
scp forzestats-backend.tar $VPS_IP:/tmp/forzestats-deploy/

# Подключаемся к VPS и развертываем
Write-Host "🔌 Подключаемся к VPS и развертываем..." -ForegroundColor Blue

$sshScript = @"
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
"@

# Сохраняем скрипт во временный файл
$tempScript = "temp_deploy_script.sh"
$sshScript | Out-File -FilePath $tempScript -Encoding UTF8

# Выполняем скрипт на VPS
Get-Content $tempScript | ssh $VPS_IP "bash -s"

# Удаляем временный файл
Remove-Item $tempScript

# Очищаем локальные tar файлы
Write-Host "🧹 Очищаем локальные tar файлы..." -ForegroundColor Blue
Remove-Item forzestats-frontend.tar
Remove-Item forzestats-backend.tar

Write-Host ""
Write-Host "🎉 Развертывание завершено!" -ForegroundColor Green
Write-Host "🌐 Приложение доступно на VPS: http://$VPS_IP" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Полезные команды для VPS:" -ForegroundColor Yellow
Write-Host "   Подключение: ssh $VPS_IP" -ForegroundColor White
Write-Host "   Статус: docker-compose ps" -ForegroundColor White
Write-Host "   Логи: docker-compose logs -f" -ForegroundColor White
Write-Host "   Остановка: docker-compose down" -ForegroundColor White
