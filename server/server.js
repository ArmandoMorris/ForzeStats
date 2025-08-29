// server.js
import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import puppeteer from 'puppeteer';
import FaceitAPI from './faceit-api.js';
import dotenv from "dotenv";

dotenv.config();

// --- Инициализация Express ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ID команды FORZE Reload
const TEAM_ID = 12857;
const TEAM_SLUG = "forze-reload";

// --- Простой in-memory кэш для FACEIT ---
const FACEIT_TTL_MS = 2 * 60 * 1000; // 2 минуты
const faceitCache = {
  stats: { data: null, ts: 0 },
  matches: { data: null, ts: 0 },
};

function isFresh(ts) {
  return Date.now() - ts < FACEIT_TTL_MS;
}

function getCache(key) {
  const entry = faceitCache[key];
  if (entry && isFresh(entry.ts)) return entry.data;
  return null;
}

function setCache(key, data) {
  faceitCache[key] = { data, ts: Date.now() };
}

// --- Функция для получения HTML через Puppeteer ---
async function fetchHtmlWithPuppeteer(url) {
  console.log(`Попытка получить HTML с помощью Puppeteer: ${url}`);
  
  let browser;
  try {
    // 1. Запуск браузера
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      ],
    });
    console.log("Браузер Puppeteer запущен.");

    // 2. Открытие новой страницы
    const page = await browser.newPage();
    console.log("Новая страница создана.");

    // 3. Установка User-Agent на странице (дополнительная мера)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
    
    // 4. Переход на целевую страницу
    console.log(`Переход на страницу: ${url}`);
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Более быстрое ожидание, чем networkidle2
      timeout: 30000 // Сокращаем таймаут до 30 секунд
    });

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()} ${response.statusText()} for ${url}`);
    }

    console.log(`Страница загружена. Статус: ${response.status()} ${response.statusText()}`);

    // 5. Получение HTML содержимого страницы
    const html = await page.content();
    console.log(`HTML успешно получен. Длина: ${html.length} символов.`);

    return html;

  } catch (error) {
    console.error(`Ошибка в fetchHtmlWithPuppeteer для ${url}:`, error.message);
    throw error;
  } finally {
    // 6. Всегда закрываем браузер
    if (browser) {
      await browser.close();
      console.log("Браузер Puppeteer закрыт.");
    }
  }
}
// --- Конец функции для получения HTML ---

// --- Вспомогательные функции для парсинга ---
function toISOfromDDMMYY(d) {
  const m = d?.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return undefined;
  const [, dd, mm, yy] = m;
  const fullYear = Number(yy) + 2000;
  return `${fullYear}-${mm}-${dd}`;
}

function parseStatsMatches(html) {
  const $ = cheerio.load(html);
  const rows = [];

  // Список карт для распознавания текста
  const MAP_RX =
    /(Ancient|Anubis|Dust ?2|Inferno|Mirage|Nuke|Overpass|Train|Vertigo|Tuscan|Cache|Cobblestone|Season)/i;

  $("table tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 6) return;

    // 1) Дата
    const date = tds.eq(0).text().trim();
    const dateISO = toISOfromDDMMYY(date);

    // 2) Event — по ссылке на событие
    const event =
      $(tr)
        .find('a[href^="/events/"], a[href^="/event/"]')
        .first()
        .text()
        .trim() || tds.eq(1).text().trim();

    // 3) Opponent — команда противника (в ячейке 3)
    let opponent = "";
    const opponentCell = tds.eq(3);
    const opponentLink = opponentCell.find('a[href^="/stats/teams/"]').first();
    
    if (opponentLink.length) {
      opponent = opponentLink.text().trim();
    } else {
      opponent = opponentCell.text().trim();
    }

    // 4) Map — карта (в ячейке 4)
    let map = tds.eq(4).text().trim();

    // 5) Счёт — ищем в ряду первый шаблон "число - число"
    const rowText = tds
      .map((i, td) => $(td).text())
      .get()
      .join(" ");
    const m = rowText.match(/(\d+)\s*-\s*(\d+)/);
    if (!m) return; // Пропускаем, если не найден счёт

    const our = Number(m[1]);
    const opp = Number(m[2]);
    if (!Number.isFinite(our) || !Number.isFinite(opp)) return; // Пропускаем, если счёт некорректный

    // 6) Итог W/L по счёту
    const wl = our > opp ? "W" : "L"; // 'W' для победы, 'L' для поражения



    rows.push({ date, dateISO, event, opponent, map, our, opp, wl });
  });

  return rows;
}
// --- Конец вспомогательных функций ---

// --- Маршруты API ---

// --- Маршрут для получения матчей ---
app.get('/api/forze/matches', async (req, res) => {
  console.log('GET /api/forze/matches requested - fetching from HLTV (stats page via Puppeteer)...');
  try {
    // Используем Puppeteer
    const url = `https://www.hltv.org/stats/teams/matches/${TEAM_ID}/${TEAM_SLUG}?csVersion=CS2`;
    console.log(`Fetching HTML from: ${url}`);
    const html = await fetchHtmlWithPuppeteer(url);
    console.log('HTML fetched successfully.');
    
    const parsedRows = parseStatsMatches(html);
    console.log(`Parsed ${parsedRows.length} matches from stats page.`);

    const processedMatches = parsedRows.map((match, index) => ({
      id: `stats_${index}`,
      date: match.dateISO ? new Date(match.dateISO).toLocaleDateString('ru-RU') : match.date,
      event: match.event || 'N/A',
      result: `${match.our}:${match.opp}`,
      opponent: match.opponent || 'Unknown Opponent',
      map: match.map || 'N/A',
      wl: match.wl || 'N/A' // Добавляем результат W/L
    }));

    res.json({ matches: processedMatches });
  } catch (err) {
    console.error('Ошибка при парсинге матчей с HLTV (stats page via Puppeteer):', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Не удалось получить данные о матчах: ' + err.message });
  }
});
// --- Конец маршрута для матчей ---

// --- Маршрут для получения состава ---
app.get('/api/forze/roster', async (req, res) => {
  console.log('GET /api/forze/roster requested - fetching from HLTV (team page via Puppeteer)...');
  try {
    const url = `https://www.hltv.org/team/${TEAM_ID}/${TEAM_SLUG}`;
    console.log(`Fetching HTML from: ${url}`);
    const html = await fetchHtmlWithPuppeteer(url);
    console.log('HTML fetched successfully.');

    const $ = cheerio.load(html);
    const players = [];

    // Парсим таблицу с игроками
    $('.teamProfile tbody tr').each((i, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 4) return; // Убедимся, что строка полная

        const nicknameElement = tds.eq(0).find('a');
        const nickname = nicknameElement.length > 0 ? nicknameElement.text().trim() : tds.eq(0).text().trim();
        
        // Ищем статус (STARTER, BENCHED) в следующих ячейках или в классах
        let status = 'N/A';
        const statusText = tds.eq(1).text().trim();
        if (statusText.includes('STARTER') || statusText.includes('BENCHED')) {
            status = statusText;
        } else {
            // Альтернативный способ: проверить классы или содержимое
            const statusCell = tds.eq(1);
            if (statusCell.find('.player-status.starter').length > 0) {
                status = 'STARTER';
            } else if (statusCell.find('.player-status.benched').length > 0) {
                status = 'BENCHED';
            }
        }
        
        const ratingText = tds.eq(3).text().trim(); // Обычно рейтинг в 4-й ячейке
        const rating = ratingText && !isNaN(parseFloat(ratingText)) ? parseFloat(ratingText).toFixed(2) : 'N/A';

        if (nickname && nickname !== '-') { // Добавляем только если есть ник
            players.push({
                id: `player_${i}`, // Генерируем ID
                nickname,
                status,
                rating30: rating,
                // country: tds.eq(0).find('img.flag').attr('alt') || 'N/A' // Можно попробовать извлечь
            });
        }
    });

    console.log(`Parsed ${players.length} players from team page.`);
    res.json({ roster: players });
  } catch (err) {
    console.error('Ошибка при парсинге состава с HLTV (team page via Puppeteer):', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Не удалось получить данные о составе: ' + err.message });
  }
});
// --- Конец маршрута для состава ---

// --- Маршрут для получения предстоящих матчей ---
app.get('/api/forze/upcoming', async (req, res) => {
  console.log('GET /api/forze/upcoming requested - fetching from HLTV (team page via Puppeteer)...');
  try {
    const url = `https://www.hltv.org/team/${TEAM_ID}/${TEAM_SLUG}`;
    console.log(`Fetching HTML from: ${url}`);
    const html = await fetchHtmlWithPuppeteer(url);
    console.log('HTML fetched successfully.');

    const $ = cheerio.load(html);
    const upcoming = [];

    // Парсим секцию с предстоящими матчами
    $('#upcoming_matches_box tbody tr').each((i, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 3) return;

        const dateText = tds.eq(0).text().trim();
        // Простая попытка парсинга даты
        let dateFormatted = 'N/A';
        if (dateText && dateText !== '-' && dateText.length > 5) { // Простая проверка
            // Это может потребовать доработки в зависимости от формата даты на HLTV
            dateFormatted = dateText; 
        }

        const eventText = tds.eq(1).find('a').first().text().trim() || tds.eq(1).text().trim();
        const opponentText = tds.eq(2).find('a').first().text().trim() || tds.eq(2).text().trim();

        // Проверяем, что это действительно предстоящий матч
        if (dateText && dateText !== '-' && (opponentText && opponentText !== '-')) {
             upcoming.push({
                id: `upcoming_${i}`,
                date: dateFormatted,
                event: eventText || 'N/A',
                opponent: opponentText || 'TBD'
            });
        }
    });

    console.log(`Parsed ${upcoming.length} upcoming matches from team page.`);
    res.json({ upcoming });
  } catch (err) {
    console.error('Ошибка при парсинге предстоящих матчей с HLTV (team page via Puppeteer):', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Не удалось получить данные о предстоящих матчах: ' + err.message });
  }
});
// --- Конец маршрута для предстоящих матчей ---

// --- Маршрут для получения данных FACEIT ---
app.get('/api/faceit/stats', async (req, res) => {
  console.log('GET /api/faceit/stats requested - fetching from FACEIT API...');
  
  try {
    const cached = getCache('stats');
    if (cached) {
      console.log('Returning FACEIT stats from cache');
      return res.json(cached);
    }

    const faceitAPI = new FaceitAPI();
    console.log('Initializing FACEIT API...');
    console.log('Starting FACEIT data fetching...');
    const faceitData = await faceitAPI.getTeamStats();
    console.log('FACEIT data fetched successfully');
    setCache('stats', faceitData);
    
    res.json(faceitData);
    
  } catch (err) {
    console.error('Ошибка при получении данных FACEIT:', err.message);
    console.error(err.stack);
    
    // Возвращаем заглушку в случае ошибки
    res.json({
      teamInfo: {
        name: 'FORZE Reload',
        level: 'Level 10',
        elo: '2456'
      },
      teamStats: {
        'Total Matches': '156',
        'Wins': '89',
        'Losses': '67',
        'Win Rate': '57.1%',
        'Current Streak': '+3',
        'Max Win Streak': '8',
        'Max Loss Streak': '4'
      },
      recentMatches: [
        { date: '2025-08-28', result: 'W', score: '16-12', map: 'Mirage', eloChange: '+25' },
        { date: '2025-08-27', result: 'W', score: '16-14', map: 'Inferno', eloChange: '+18' },
        { date: '2025-08-26', result: 'L', score: '12-16', map: 'Nuke', eloChange: '-22' },
        { date: '2025-08-25', result: 'W', score: '16-10', map: 'Dust2', eloChange: '+20' },
      ],
      scrapedAt: new Date().toISOString(),
      error: 'Using fallback data due to server error'
    });
  }
});

// --- Маршрут для получения всех матчей FACEIT ---
app.get('/api/faceit/matches', async (req, res) => {
  console.log('GET /api/faceit/matches requested - fetching all matches from FACEIT API...');
  
  try {
    const cached = getCache('matches');
    if (cached) {
      console.log('Returning FACEIT matches from cache');
      return res.json({
        matches: cached,
        totalCount: cached.length,
        cached: true,
        fetchedAt: new Date().toISOString()
      });
    }

    const faceitAPI = new FaceitAPI();
    console.log('Initializing FACEIT API...');
    console.log('Starting FACEIT matches fetching...');
    const matches = await faceitAPI.getAllMatches();
    console.log(`FACEIT matches fetched successfully: ${matches.length} matches`);
    setCache('matches', matches);
    
    res.json({
      matches,
      totalCount: matches.length,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Ошибка при получении матчей FACEIT:', err.message);
    console.error(err.stack);
    
    res.status(500).json({
      error: 'Failed to fetch FACEIT matches',
      message: err.message
    });
  }
});

// --- Маршрут для получения информации о количестве матчей ---
app.get('/api/faceit/info', async (req, res) => {
  console.log('GET /api/faceit/info requested - getting FACEIT info...');
  
  try {
    const cached = getCache('info');
    if (cached) {
      console.log('Returning FACEIT info from cache');
      return res.json(cached);
    }
    // Сначала попробуем получить базовую информацию
    const response = await fetch('https://www.faceit.com/api/stats/v1/stats/time/teams/8689f8ac-c01b-40f4-96c6-9e7627665b65/games/cs2?page=0&size=1');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Получаем заголовки для понимания общего количества
    const totalCount = response.headers.get('x-total-count') || 'Unknown';
    const lastModified = response.headers.get('last-modified') || 'Unknown';
    
    const payload = {
      apiStatus: 'Available',
      totalCount,
      lastModified,
      checkedAt: new Date().toISOString()
    };
    setCache('info', payload);
    res.json(payload);
    
  } catch (err) {
    console.error('Error getting FACEIT info:', err.message);
    
    res.json({
      apiStatus: 'Error',
      error: err.message,
      checkedAt: new Date().toISOString()
    });
  }
});

// --- Тестовый маршрут для проверки разных страниц ---
app.get('/api/faceit/test-pages', async (req, res) => {
  console.log('GET /api/faceit/test-pages requested - testing different page numbers...');
  
  try {
    const cached = getCache('testPages');
    if (cached) {
      console.log('Returning FACEIT test-pages from cache');
      return res.json(cached);
    }

    const results = {};
    
    // Тестируем страницы 0, 1, 2, 3
    for (let page = 0; page <= 3; page++) {
      const url = `https://www.faceit.com/api/stats/v1/stats/time/teams/8689f8ac-c01b-40f4-96c6-9e7627665b65/games/cs2?page=${page}&size=100`;
      console.log(`Testing page ${page}: ${url}`);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        results[`page_${page}`] = {
          url,
          matchesCount: data.length,
          firstMatchId: data[0]?._id?.matchId || 'N/A',
          lastMatchId: data[data.length-1]?._id?.matchId || 'N/A'
        };
      } else {
        results[`page_${page}`] = {
          url,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const payload = {
      testResults: results,
      testedAt: new Date().toISOString()
    };
    setCache('testPages', payload);
    res.json(payload);
    
  } catch (err) {
    console.error('Error testing FACEIT pages:', err.message);
    
    res.status(500).json({
      error: 'Failed to test FACEIT pages',
      message: err.message
    });
  }
});
// --- Конец маршрута для FACEIT ---

// --- Комбинированный маршрут для FACEIT (статы + матчи) ---
app.get('/api/faceit/combined', async (req, res) => {
  console.log('GET /api/faceit/combined requested');
  try {
    const statsCached = getCache('stats');
    const matchesCached = getCache('matches');

    if (statsCached && matchesCached) {
      console.log('Returning combined FACEIT data from cache');
      return res.json({
        stats: statsCached,
        matches: matchesCached,
        cached: true,
        combinedAt: new Date().toISOString()
      });
    }

    const faceitAPI = new FaceitAPI();
    const [stats, matches] = await Promise.all([
      statsCached ? Promise.resolve(statsCached) : faceitAPI.getTeamStats(),
      matchesCached ? Promise.resolve(matchesCached) : faceitAPI.getAllMatches()
    ]);

    if (!statsCached) setCache('stats', stats);
    if (!matchesCached) setCache('matches', matches);

    res.json({
      stats,
      matches,
      cached: false,
      combinedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Ошибка в /api/faceit/combined:', err.message);
    res.status(500).json({ error: 'Failed to get combined FACEIT data', message: err.message });
  }
});

// --- Запуск сервера ---
app.listen(PORT, async () => {
  console.log(`FORZE Backend API запущен на http://localhost:${PORT}`);
  // Тестовый вызов парсера при запуске
  try {
    console.log('Выполняем тестовый вызов парсера HLTV (via Puppeteer) при запуске...');
    const testUrl = `https://www.hltv.org/stats/teams/matches/${TEAM_ID}/${TEAM_SLUG}?csVersion=CS2`;
    await fetchHtmlWithPuppeteer(testUrl);
    console.log('Тестовый вызов fetch для парсера (via Puppeteer) успешен.');
  } catch (e) {
     console.error('Тестовый вызов парсера HLTV (via Puppeteer) при запуске завершился ошибкой:', e.message);
  }
});
// --- Конец запуска сервера ---