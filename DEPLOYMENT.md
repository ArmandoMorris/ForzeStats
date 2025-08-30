# Инструкции по деплою

## Node.js Backend

### Локальная разработка

1. Убедитесь, что у вас установлен Node.js 18+
2. Перейдите в папку server:
```bash
cd server
```

3. Установите зависимости:
```bash
npm install
```

4. Запустите сервер:
```bash
node server.js
```

Сервер будет доступен на http://localhost:3001

### Деплой на Railway

1. Создайте аккаунт на [Railway](https://railway.app)
2. Подключите ваш GitHub репозиторий
3. Укажите папку `server` как корневую
4. Railway автоматически определит Node.js проект
5. Установите переменные окружения:
   - `PORT`: 3001 (или порт, который предоставляет Railway)

### Деплой на Render

1. Создайте аккаунт на [Render](https://render.com)
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Укажите папку `server`
5. Build Command: `npm install`
6. Start Command: `node server.js`

### Деплой на Heroku

1. Создайте аккаунт на [Heroku](https://heroku.com)
2. Установите Heroku CLI
3. Создайте приложение:
```bash
heroku create your-app-name
```

4. Деплойте:
```bash
git subtree push --prefix server heroku main
```

## Frontend на Vercel

### Подготовка

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. В корне проекта создайте файл `.env.local`:
```
VITE_API_URL=https://your-backend-url.com
```

### Деплой

1. Войдите в Vercel:
```bash
vercel login
```

2. Деплойте проект:
```bash
vercel
```

3. Или деплойте в продакшн:
```bash
vercel --prod
```

### Настройка в Vercel Dashboard

1. Перейдите в настройки проекта в Vercel Dashboard
2. Добавьте переменную окружения:
   - `VITE_API_URL`: URL вашего Node.js бэкенда

## Проверка работы

1. Backend API: `https://your-backend-url.com/api/forze/matches`
2. Frontend: `https://your-vercel-app.vercel.app`

## Структура проекта после деплоя

```
/
├── server/           # Node.js backend
│   ├── server.js
│   ├── package.json
│   ├── faceit-api.js
│   └── ...
├── src/             # React frontend
├── package.json
├── vite.config.js
├── vercel.json      # Vercel конфигурация
└── ...
```

## Особенности деплоя

### Puppeteer на хостинге
- Railway и Render поддерживают Puppeteer из коробки
- На Heroku может потребоваться дополнительная настройка
- Убедитесь, что в package.json указана правильная версия Puppeteer

### CORS настройки
- Backend уже настроен для работы с Vercel
- CORS разрешает все источники (`*`)
- Для продакшена рекомендуется ограничить домены

### Переменные окружения
- `PORT`: порт сервера (автоматически устанавливается хостингом)
- `VITE_API_URL`: URL бэкенда для фронтенда
