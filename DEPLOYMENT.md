# 🚀 Развертывание ForzeStats на VPS

## 📋 Требования

- **VPS сервер** с Ubuntu 20.04+ или CentOS 8+
- **Docker** и **Docker Compose**
- **Минимум 2GB RAM** и **20GB дискового пространства**
- **Открытые порты**: 80 (HTTP), 443 (HTTPS), 22 (SSH)

## 🐳 Установка Docker на VPS

### Ubuntu/Debian:
```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавляем пользователя в группу docker
sudo usermod -aG docker $USER

# Устанавливаем Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагружаемся
sudo reboot
```

### CentOS/RHEL:
```bash
# Устанавливаем Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io

# Запускаем Docker
sudo systemctl start docker
sudo systemctl enable docker

# Устанавливаем Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## �� Развертывание

### Вариант 1: Локальная сборка + загрузка на VPS (Рекомендуется)

#### Для Windows (PowerShell):
```powershell
# 1. Устанавливаем Docker Desktop для Windows
# 2. Клонируем репозиторий
git clone https://github.com/ArmandoMorris/ForzeStats.git
cd ForzeStats

# 3. Запускаем развертывание (замените YOUR_VPS_IP на IP вашего VPS)
.\build-and-deploy.ps1 YOUR_VPS_IP production
```

#### Для Linux/macOS:
```bash
# 1. Устанавливаем Docker
# 2. Клонируем репозиторий
git clone https://github.com/ArmandoMorris/ForzeStats.git
cd ForzeStats

# 3. Делаем скрипт исполняемым
chmod +x build-and-deploy.sh

# 4. Запускаем развертывание (замените YOUR_VPS_IP на IP вашего VPS)
./build-and-deploy.sh YOUR_VPS_IP production
```

### Вариант 2: Сборка на VPS

```bash
# 1. Клонируем репозиторий на VPS
git clone https://github.com/ArmandoMorris/ForzeStats.git
cd ForzeStats

# 2. Запускаем развертывание
chmod +x deploy.sh
./deploy.sh production
```

## 🌐 Доступ к приложению

После успешного развертывания:

- **Фронтенд**: `http://YOUR_VPS_IP`
- **Бэкенд API**: `http://YOUR_VPS_IP:3001`
- **Статус**: `http://YOUR_VPS_IP:3001/api/health`

## 🔧 Управление

### Основные команды:
```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр логов
docker-compose logs -f [service_name]

# Обновление
git pull
./deploy.sh production
```

### Мониторинг:
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f frontend
docker-compose logs -f backend
```

## 🔒 Безопасность

### Firewall (UFW):
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSL сертификат (Let's Encrypt):
```bash
# Устанавливаем Certbot
sudo apt install certbot python3-certbot-nginx

# Получаем сертификат
sudo certbot --nginx -d yourdomain.com
```

## 📊 Мониторинг и логи

### Логи приложения:
```bash
# Фронтенд (nginx)
docker-compose logs frontend

# Бэкенд (Node.js)
docker-compose logs backend

# Все логи
docker-compose logs
```

### Метрики:
```bash
# Использование ресурсов
docker stats

# Размер образов
docker images

# Использование диска
docker system df
```

## 🚨 Устранение неполадок

### Проблемы с портами:
```bash
# Проверяем занятые порты
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3001

# Останавливаем конфликтующие сервисы
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### Проблемы с Docker:
```bash
# Перезапускаем Docker
sudo systemctl restart docker

# Очищаем систему
docker system prune -a

# Проверяем статус
sudo systemctl status docker
```

### Проблемы с приложением:
```bash
# Проверяем логи
docker-compose logs -f

# Перезапускаем сервис
docker-compose restart [service_name]

# Пересобираем образ
docker-compose build --no-cache [service_name]
```

## 🔄 Обновление

### Автоматическое обновление:
```bash
# Создаем cron задачу
crontab -e

# Добавляем строку для ежедневного обновления в 2:00
0 2 * * * cd /path/to/ForzeStats && git pull && ./deploy.sh production
```

### Ручное обновление:
```bash
# Останавливаем сервисы
docker-compose down

# Обновляем код
git pull

# Пересобираем и запускаем
./deploy.sh production
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `docker-compose ps`
3. Проверьте ресурсы: `docker stats`
4. Создайте issue в GitHub с логами ошибок

## 🎯 Оптимизация

### Для продакшена:
- Используйте **reverse proxy** (nginx/traefik)
- Настройте **SSL сертификаты**
- Настройте **мониторинг** (Prometheus + Grafana)
- Настройте **backup** данных
- Используйте **persistent volumes** для данных

### Для staging:
- Используйте **меньше ресурсов**
- Настройте **автоматические тесты**
- Настройте **CI/CD pipeline**

## 🆚 Сравнение подходов

| Подход | Скорость | Ресурсы VPS | Сложность | Рекомендация |
|--------|----------|--------------|-----------|--------------|
| **Локальная сборка** | ⚡ Быстро | 🟢 Минимум | 🟡 Средняя | ✅ **Да** |
| **Сборка на VPS** | 🐌 Медленно | 🔴 Много | 🟢 Простая | ⚠️ Нет |

### Преимущества локальной сборки:
- 🚀 **Быстрое развертывание** (2-3 минуты vs 10-15 минут)
- 💰 **Экономия ресурсов** VPS
- 🔒 **Безопасность** - код не компилируется на сервере
- 📦 **Контроль** над процессом сборки

### Когда использовать сборку на VPS:
- 🧪 **Тестирование** новых функций
- 🔄 **Частые обновления** (больше 5 раз в день)
- 💻 **Отсутствие** Docker на локальной машине
