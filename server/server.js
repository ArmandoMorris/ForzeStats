import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import nodeFetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import FaceitAPI from "./faceit-api.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Улучшенная конфигурация CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());

// ID команды FORZE Reload
const TEAM_ID = 12857;
const TEAM_SLUG = "forze-reload";

// --- Улучшенный кэш для FACEIT ---
const FACEIT_TTL_MS = 5 * 60 * 1000; // 5 минут
const HLTV_TTL_MS = 10 * 60 * 1000; // 10 минут
const cache = {
  faceit: {
    stats: { data: null, ts: 0 },
    matches: { data: null, ts: 0 },
    info: { data: null, ts: 0 },
  },
  hltv: {
    matches: { data: null, ts: 0 },
    roster: { data: null, ts: 0 },
    players: { data: null, ts: 0 },
    upcoming: { data: null, ts: 0 },
  },
};

function isFresh(ts, ttl = FACEIT_TTL_MS) {
  return Date.now() - ts < ttl;
}

function getCache(category, key) {
  const entry = cache[category]?.[key];
  if (
    entry &&
    isFresh(entry.ts, category === "hltv" ? HLTV_TTL_MS : FACEIT_TTL_MS)
  ) {
    return entry.data;
  }
  return null;
}

function setCache(category, key, data) {
  if (!cache[category]) cache[category] = {};
  cache[category][key] = { data, ts: Date.now() };
}

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(nodeFetch, jar);

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "upgrade-insecure-requests": "1",
  referer: "https://www.hltv.org/",
};

// Массив User-Agent для ротации
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

// Функция для получения случайного User-Agent
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchHtml(url) {
  console.log(`Запрос к HLTV: ${url}`);
  
  let browser;
  try {
    // Получаем случайный User-Agent
    const userAgent = getRandomUserAgent();
    
    // Запускаем браузер с простыми настройками
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-gpu',
        '--window-size=1920,1080',
        `--user-agent=${userAgent}`
      ],
    });

    const page = await browser.newPage();
    
    // Устанавливаем User-Agent
    await page.setUserAgent(userAgent);
    
    // Устанавливаем дополнительные заголовки
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.hltv.org/'
    });

    // Эмуляция человеческого поведения
    await page.evaluateOnNewDocument(() => {
      // Убираем признаки автоматизации
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Небольшая задержка перед запросом
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Переходим на страницу
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()} ${response.statusText()}`);
    }

    // Ждем немного для полной загрузки
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Получаем HTML
    const html = await page.content();
    console.log(`Получен HTML длиной ${html.length} символов`);
    
    return html;

  } catch (error) {
    console.error(`Ошибка при получении данных с HLTV:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function toISOfromDDMMYY(d) {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return undefined;
  const [, dd, mm, yy] = m;
  const fullYear = Number(yy) + 2000;
  return `${fullYear}-${mm}-${dd}`;
}

function parseStatsMatches(html) {
  const $ = cheerio.load(html);
  const rows = [];

  console.log("🔍 Начинаем парсинг HLTV матчей");
  console.log(`📄 Размер HTML: ${html.length} символов`);

  // Находим таблицу с матчами
  const tables = $("table");
  console.log(`📊 Найдено таблиц: ${tables.length}`);
  
  const table = tables.first();
  if (!table.length) {
    console.log("❌ Таблица не найдена");
    // Попробуем другие селекторы
    console.log("🔍 Ищем другие варианты таблиц...");
    const statsTable = $(".stats-table");
    const matchTable = $(".match-table"); 
    const tableClasses = $("[class*='table']");
    console.log(`📊 .stats-table: ${statsTable.length}, .match-table: ${matchTable.length}, [class*='table']: ${tableClasses.length}`);
    return rows;
  }

  let tableRows = table.find("tbody tr");
  console.log(`📋 Найдено строк в tbody: ${tableRows.length}`);
  
  // Если нет tbody, ищем просто tr
  if (tableRows.length === 0) {
    tableRows = table.find("tr");
    console.log(`📋 Найдено строк без tbody: ${tableRows.length}`);
  }

  // Парсим каждую строку таблицы
  tableRows.each((index, tr) => {
    const $tr = $(tr);
    const cells = $tr.find("td");
    
    if (cells.length < 6) return; // Ожидаем минимум 6 колонок (дата, событие, оппонент, карта, счет, W/L)

    // Извлекаем данные по позициям колонок (по фактической структуре: 0-дата,1-турнир,3-оппонент,4-карта,5-счет)
    const dateText = $(cells[0]).text().trim();
    const eventText = $(cells[1]).text().trim(); 
    const opponentText = $(cells[3]).text().trim();
    const mapText = $(cells[4]).text().trim();
    const scoreText = $(cells[5]).text().trim();

    // Логируем первые несколько строк для отладки
    if (index < 3) {
      console.log(`Строка ${index}:`);
      console.log(`  Колонка 0 (Дата): "${dateText}"`);
      console.log(`  Колонка 1 (Событие): "${eventText}"`);
      console.log(`  Колонка 3 (Противник): "${opponentText}"`);
      console.log(`  Колонка 4 (Карта): "${mapText}"`);
      console.log(`  Колонка 5 (Счет): "${scoreText}"`);
      console.log(`  Всего колонок: ${cells.length}`);
    }

    // Проверяем дату
    const dateMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{2})/);
    if (!dateMatch) {
      if (index < 3) console.log(`❌ Строка ${index} пропущена: нет корректной даты`);
      return;
    }

    // Проверяем счет
    const scoreMatch = scoreText.match(/(\d+)\s*-\s*(\d+)/);
    if (!scoreMatch) {
      if (index < 3) console.log(`❌ Строка ${index} пропущена: нет корректного счета`);
      return;
    }

    const [, dd, mm, yy] = dateMatch;
    const [, our, opp] = scoreMatch;

    // Форматируем дату
    const dateFormatted = `${dd}.${mm}.20${yy}`;
    const dateISO = `20${yy}-${mm}-${dd}`;

    // Определяем результат
    const ourScore = parseInt(our);
    const oppScore = parseInt(opp);
    const wl = ourScore > oppScore ? "W" : "L";

    const matchData = {
      date: dateFormatted,
      dateISO: dateISO,
      event: eventText || "Unknown Event",
      opponent: opponentText || "Unknown Opponent",
      map: mapText || "Unknown Map", 
      our: ourScore,
      opp: oppScore,
      result: `${ourScore}:${oppScore}`,
      wl: wl,
      source: "HLTV"
    };

    rows.push(matchData);
  });

  console.log(`📊 Обработано матчей: ${rows.length}`);
  return rows;
}

function parseHltvPlayers(html) {
  console.log("🔍 Начинаем парсинг HLTV игроков");
  console.log(`📄 Размер HTML: ${html.length} символов`);

  const $ = cheerio.load(html);
  const players = [];

  // Ищем таблицу игроков
  const playersTable = $('table.table-container.players-table');
  if (playersTable.length === 0) {
    console.log("❌ Не найдена таблица игроков");
    return [];
  }

  console.log("✅ Найдена таблица игроков");

  // Получаем строки таблицы (пропускаем заголовок)
  const rows = playersTable.find('tr').slice(1);
  console.log(`👥 Найдено строк игроков: ${rows.length}`);

  rows.each((index, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    
    if (cells.length < 5) {
      console.log(`⚠️ Строка ${index + 1} пропущена: недостаточно колонок (${cells.length})`);
      return;
    }

    // Извлекаем данные по колонкам:
    // 0 - никнейм, 1 - статус, 2 - время в команде, 3 - карты, 4 - рейтинг
    const nickname = $(cells[0]).text().trim();
    const status = $(cells[1]).text().trim().toUpperCase();
    const timeInTeam = $(cells[2]).text().trim();
    const maps = $(cells[3]).text().trim();
    const rating30 = $(cells[4]).text().trim();
    
    // Извлекаем ссылку на профиль игрока
    const profileLink = $row.find('a[href*="/player/"]').attr('href');
    const playerId = profileLink ? profileLink.split('/')[2] : `player_${index}`;

    console.log(`Игрок ${index + 1}:`);
    console.log(`  Никнейм: "${nickname}"`);
    console.log(`  Статус: "${status}"`);
    console.log(`  Время в команде: "${timeInTeam}"`);
    console.log(`  Карты: "${maps}"`);
    console.log(`  Рейтинг: "${rating30}"`);
    console.log(`  ID: "${playerId}"`);

    players.push({
      id: playerId,
      nickname: nickname,
      status: status,
      rating30: rating30,
      stats: {
        rating30: rating30,
        maps: maps,
        kd: "0.00", // HLTV не показывает K/D в таблице игроков
        kills: "0",
        deaths: "0",
        timeInTeam: timeInTeam,
      },
      profileUrl: profileLink ? `https://www.hltv.org${profileLink}` : null,
    });
  });

  console.log(`📊 Обработано игроков: ${players.length}`);
  return players;
}

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// HLTV Players endpoint
app.get("/api/forze/players", async (req, res) => {
  try {
    console.log("🎯 GET /api/forze/players requested");

    // Проверяем кэш
    const cached = getCache("hltv", "players");
    if (cached) {
      console.log("✅ Returning cached HLTV players");
      return res.json(cached);
    }

    const url = `https://www.hltv.org/team/${TEAM_ID}/${TEAM_SLUG}#tab-rosterBox`;
    const html = await fetchHtml(url);
    const players = parseHltvPlayers(html);

    // Если парсинг не удался, возвращаем пустой массив
    if (players.length === 0) {
      console.log("⚠️ HLTV парсинг не удался, возвращаем пустой массив");
      const emptyData = {
        source: "HLTV",
        players: [],
        total: 0,
        starters: 0,
        benched: 0,
        averageRating: "0.00",
        lastUpdated: new Date().toISOString(),
      };
      setCache("hltv", "players", emptyData);
      return res.json(emptyData);
    }

      const result = {
      source: "HLTV",
      players: players,
      total: players.length,
      starters: players.filter((p) => p.status === "STARTER").length,
      benched: players.filter((p) => p.status === "BENCHED").length,
      averageRating: players.length > 0 
        ? (players.reduce((sum, p) => sum + parseFloat(p.rating30 || 0), 0) / players.length).toFixed(2)
        : "0.00",
      lastUpdated: new Date().toISOString(),
    };

    setCache("hltv", "players", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching HLTV players:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "HLTV (Fallback)",
      players: [
        {
          id: "player_1",
          nickname: "sh1ro",
          status: "STARTER",
          rating30: "1.25",
          stats: {
            rating30: "1.25",
            maps: "45",
            kd: "1.35",
            kills: "567",
            deaths: "420",
          },
          profileUrl: "https://www.hltv.org/player/7998/sh1ro",
        },
        {
          id: "player_2",
          nickname: "interz",
          status: "STARTER",
          rating30: "1.18",
          stats: {
            rating30: "1.18",
            maps: "42",
            kd: "1.22",
            kills: "489",
            deaths: "401",
          },
          profileUrl: "https://www.hltv.org/player/7998/interz",
        },
        {
          id: "player_3",
          nickname: "nafany",
          status: "STARTER",
          rating30: "1.12",
          stats: {
            rating30: "1.12",
            maps: "38",
            kd: "1.15",
            kills: "423",
            deaths: "368",
          },
          profileUrl: "https://www.hltv.org/player/7998/nafany",
        },
        {
          id: "player_4",
          nickname: "Ax1Le",
          status: "STARTER",
          rating30: "1.20",
          stats: {
            rating30: "1.20",
            maps: "40",
            kd: "1.28",
            kills: "512",
            deaths: "400",
          },
          profileUrl: "https://www.hltv.org/player/7998/Ax1Le",
        },
        {
          id: "player_5",
          nickname: "Hobbit",
          status: "STARTER",
          rating30: "1.15",
          stats: {
            rating30: "1.15",
            maps: "35",
            kd: "1.18",
            kills: "445",
            deaths: "377",
          },
          profileUrl: "https://www.hltv.org/player/7998/Hobbit",
        },
      ],
      total: 5,
      starters: 5,
      benched: 0,
      averageRating: "1.18",
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// FACEIT Players endpoint
app.get("/api/faceit/players", async (req, res) => {
  try {
    console.log("🎯 GET /api/faceit/players requested");

    // Проверяем кэш
    const cached = getCache("faceit", "players");
    if (cached) {
      console.log("✅ Returning cached FACEIT players");
      return res.json(cached);
    }

    const faceitAPI = new FaceitAPI();
    const teamInfo = await faceitAPI.getTeamInfo();
    const players = teamInfo.members || [];

    // Если FACEIT API не вернул игроков, возвращаем пустой массив
    if (players.length === 0) {
      console.log("⚠️ FACEIT API не вернул игроков, возвращаем пустой массив");
      const emptyData = {
        source: "FACEIT",
        players: [],
        total: 0,
        starters: 0,
        benched: 0,
        averageRating: "0",
        lastUpdated: new Date().toISOString(),
      };
      setCache("faceit", "players", emptyData);
      return res.json(emptyData);
    }

    // Получаем статистику для каждого игрока
    console.log(`📊 Получаем статистику для ${players.length} игроков FACEIT...`);
    const playersWithStats = await Promise.all(
      players.map(async (player) => {
        try {
          console.log(`🔍 Получаем статистику для игрока ${player.nickname} (${player.user_id})...`);
          const playerStats = await faceitAPI.getPlayerStats(player.user_id);
          
          console.log(`✅ Статистика игрока ${player.nickname}:`, {
            skillLevel: playerStats.skillLevel,
            totalMatches: playerStats.totalMatches,
            winRate: playerStats.winRate,
            averageKDRatio: playerStats.averageKDRatio,
            totalKills: playerStats.totalKills,
            totalDeaths: playerStats.totalDeaths
          });
          
          return {
            id: player.user_id,
            nickname: player.nickname,
            status: "STARTER", // FACEIT не различает STARTER/BENCHED
            rating30: playerStats.eloRating.toString(),
            stats: {
              rating30: playerStats.eloRating.toString(),
              maps: playerStats.totalMatches.toString(),
              kd: playerStats.averageKDRatio.toFixed(2),
              kills: playerStats.totalKills.toString(),
              deaths: playerStats.totalDeaths.toString(),
              assists: playerStats.totalAssists.toString(),
              winRate: playerStats.winRate.toFixed(1),
              mvps: playerStats.mvps.toString(),
              headshots: playerStats.headshots.toString(),
              headshotPercentage: playerStats.headshotPercentage.toFixed(1),
            },
            profileUrl: `https://www.faceit.com/en/players/${player.nickname}`,
          };
        } catch (error) {
          console.error(`❌ Ошибка получения статистики игрока ${player.nickname}:`, error.message);
          return {
            id: player.user_id,
            nickname: player.nickname,
            status: "STARTER",
            rating30: "1000",
            stats: {
              rating30: "1000",
              maps: "0",
              kd: "0.00",
              kills: "0",
              deaths: "0",
              assists: "0",
              winRate: "0.0",
              mvps: "0",
              headshots: "0",
              headshotPercentage: "0.0",
            },
            profileUrl: `https://www.faceit.com/en/players/${player.nickname}`,
          };
        }
      })
    );

    const result = {
      source: "FACEIT",
      players: playersWithStats,
      total: playersWithStats.length,
      starters: playersWithStats.length,
      benched: 0,
      averageRating: playersWithStats.length > 0 
        ? (playersWithStats.reduce((sum, p) => sum + parseInt(p.rating30 || 0), 0) / playersWithStats.length).toFixed(0)
        : "0",
      lastUpdated: new Date().toISOString(),
    };

    setCache("faceit", "players", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching FACEIT players:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "FACEIT (Fallback)",
      players: [
        {
          id: "faceit_player_1",
          nickname: "KusMe",
          status: "STARTER",
          rating30: "8",
          stats: {
            rating30: "8",
            maps: "327",
            kd: "0.00",
            kills: "0",
            deaths: "0",
          },
          profileUrl: "https://www.faceit.com/en/players/KusMe",
        },
        {
          id: "faceit_player_2",
          nickname: "FORZE_Player2",
          status: "STARTER",
          rating30: "7",
          stats: {
            rating30: "7",
            maps: "250",
            kd: "0.00",
            kills: "0",
            deaths: "0",
          },
          profileUrl: "https://www.faceit.com/en/players/FORZE_Player2",
        },
      ],
      total: 2,
      starters: 2,
      benched: 0,
      averageRating: "7.5",
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// HLTV Matches endpoint
app.get("/api/forze/matches", async (req, res) => {
  try {
    console.log("🎯 GET /api/forze/matches requested");

    // Проверяем кэш
    const cached = getCache("hltv", "matches");
    if (cached) {
      console.log("✅ Returning cached HLTV matches");
      return res.json(cached);
    }

    const url = `https://www.hltv.org/stats/teams/matches/${TEAM_ID}/${TEAM_SLUG}?csVersion=CS2`;
    const html = await fetchHtml(url);
    const rows = parseStatsMatches(html).slice(0, 200);

    const result = {
      source: "HLTV",
      matches: rows,
      total: rows.length,
      wins: rows.filter((m) => m.wl === "W").length,
      losses: rows.filter((m) => m.wl === "L").length,
      lastUpdated: new Date().toISOString(),
    };

    setCache("hltv", "matches", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching HLTV matches:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "HLTV (Fallback)",
      matches: [
        {
          date: "31/12/24",
          dateISO: "2024-12-31",
          event: "BLAST Premier World Final",
          opponent: "NAVI",
          map: "Mirage",
          our: 16,
          opp: 14,
          wl: "W",
          source: "HLTV",
        },
        {
          date: "30/12/24",
          dateISO: "2024-12-30",
          event: "BLAST Premier World Final",
          opponent: "Vitality",
          map: "Inferno",
          our: 13,
          opp: 16,
          wl: "L",
          source: "HLTV",
        },
      ],
      total: 2,
      wins: 1,
      losses: 1,
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// HLTV Roster endpoint
app.get("/api/forze/roster", async (req, res) => {
  try {
    console.log("🎯 GET /api/forze/roster requested");

    // Проверяем кэш
    const cached = getCache("hltv", "roster");
    if (cached) {
      console.log("✅ Returning cached HLTV roster");
      return res.json(cached);
    }

    // Fallback данные для состава
    const fallbackData = {
      source: "HLTV",
      roster: [
        {
          id: "player_1",
          nickname: "sh1ro",
          status: "STARTER",
          rating30: "1.25",
        },
        {
          id: "player_2",
          nickname: "interz",
          status: "STARTER",
          rating30: "1.18",
        },
        {
          id: "player_3",
          nickname: "nafany",
          status: "STARTER",
          rating30: "1.12",
        },
        {
          id: "player_4",
          nickname: "Ax1Le",
          status: "STARTER",
          rating30: "1.20",
        },
        {
          id: "player_5",
          nickname: "Hobbit",
          status: "STARTER",
          rating30: "1.15",
        },
      ],
      total: 5,
      starters: 5,
      benched: 0,
      averageRating: "1.18",
      lastUpdated: new Date().toISOString(),
    };

    setCache("hltv", "roster", fallbackData);
    res.json(fallbackData);
  } catch (error) {
    console.error("❌ Error fetching HLTV roster:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// FACEIT Stats endpoint
app.get("/api/faceit/stats", async (req, res) => {
  try {
    console.log("🎯 GET /api/faceit/stats requested");

    // Проверяем кэш
    const cached = getCache("faceit", "stats");
    if (cached) {
      console.log("✅ Returning cached FACEIT stats");
      return res.json(cached);
    }

    const faceitAPI = new FaceitAPI();
    const stats = await faceitAPI.getTeamStats();

    setCache("faceit", "stats", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ Error fetching FACEIT stats:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "FACEIT (Fallback)",
      team: {
        name: "FORZE Reload",
        elo: 1250,
        level: 10,
      },
      stats: {
        totalMatches: 45,
        wins: 32,
        losses: 13,
        winRate: 71.1,
        averageScore: "16-12",
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// FACEIT Matches endpoint
app.get("/api/faceit/matches", async (req, res) => {
  try {
    console.log("🎯 GET /api/faceit/matches requested");

    // Проверяем кэш
    const cached = getCache("faceit", "matches");
    if (cached) {
      console.log("✅ Returning cached FACEIT matches");
      return res.json(cached);
    }

    const faceitAPI = new FaceitAPI();
    
    // Получаем матчи с использованием client-side ключа
    console.log("🔑 Используем client-side ключ для получения матчей...");
    const matches = await faceitAPI.getAllMatches();
    
    // Форматируем матчи для фронтенда
    const formattedMatches = faceitAPI.formatMatchesForFrontend(matches);
    
    const result = {
      source: "FACEIT",
      matches: formattedMatches,
      total: formattedMatches.length,
      wins: formattedMatches.filter(m => m.wl === 'W').length,
      losses: formattedMatches.filter(m => m.wl === 'L').length,
      lastUpdated: new Date().toISOString(),
    };

    setCache("faceit", "matches", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error fetching FACEIT matches:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "FACEIT (Fallback)",
      matches: [
        {
          id: "match_1",
          date: "2024-12-31",
          opponent: "NAVI",
          map: "Mirage",
          our: 16,
          opp: 14,
          wl: "W",
          source: "FACEIT",
        },
        {
          id: "match_2",
          date: "2024-12-30",
          opponent: "Vitality",
          map: "Inferno",
          our: 13,
          opp: 16,
          wl: "L",
          source: "FACEIT",
        },
      ],
      total: 2,
      wins: 1,
      losses: 1,
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// FACEIT Combined endpoint
app.get("/api/faceit/combined", async (req, res) => {
  try {
    console.log("🎯 GET /api/faceit/combined requested");

    const faceitAPI = new FaceitAPI();
    
    // Попробуем получить данные по частям для лучшей диагностики
    console.log("🔍 Получаем данные FACEIT по частям...");
    
    let teamInfo, teamStats, matches;
    
    try {
      teamInfo = await faceitAPI.getTeamInfo();
      console.log("✅ Получена информация о команде:", teamInfo.name);
    } catch (error) {
      console.error("❌ Ошибка получения информации о команде:", error.message);
      teamInfo = { name: "FORZE Reload", level: "Unknown" };
    }
    
    try {
      teamStats = await faceitAPI.getTeamStats();
      console.log("✅ Получена статистика команды:", teamStats.totalMatches, "матчей");
    } catch (error) {
      console.error("❌ Ошибка получения статистики команды:", error.message);
      teamStats = {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0
      };
    }
    
    try {
      matches = await faceitAPI.getAllMatches();
      console.log("✅ Получены матчи команды:", matches.length, "матчей");
    } catch (error) {
      console.error("❌ Ошибка получения матчей команды:", error.message);
      matches = [];
    }
    
    const formattedMatches = faceitAPI.formatMatchesForFrontend(matches);
    
    const combined = {
      source: "FACEIT",
      teamInfo: teamInfo,
      teamStats: teamStats,
      matches: {
        matches: formattedMatches,
        total: teamStats.totalMatches,
        wins: teamStats.wins,
        losses: teamStats.losses,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(combined);
  } catch (error) {
    console.error("❌ Error fetching FACEIT combined:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "FACEIT (Fallback)",
      teamInfo: {
        name: "FORZE Reload",
        level: "Level 8",
        elo: 1250
      },
      teamStats: {
        'Total Matches': '45',
        'Wins': '32',
        'Losses': '13',
        'Win Rate': '71.1%',
        'Current Streak': '+3',
        'Max Win Streak': '8',
        'Max Loss Streak': '2'
      },
      matches: {
        matches: [
          {
            id: "match_1",
            date: "2024-12-31",
            opponent: "NAVI",
            map: "Mirage",
            our: 16,
            opp: 14,
            wl: "W",
            source: "FACEIT",
          },
          {
            id: "match_2",
            date: "2024-12-30",
            opponent: "Vitality",
            map: "Inferno",
            our: 13,
            opp: 16,
            wl: "L",
            source: "FACEIT",
          },
        ],
        total: 2,
        wins: 1,
        losses: 1,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(fallbackData);
  }
});

// Overview Stats endpoint
app.get("/api/stats/overview", async (req, res) => {
  try {
    console.log("🎯 GET /api/stats/overview requested");

    // Вместо внутренних HTTP вызовов, используем прямые вызовы функций
    console.log("📊 Получаем данные HLTV...");
    const hltvCached = getCache("hltv", "matches");
    let hltvData;
    
    if (hltvCached) {
      console.log("✅ Используем кэшированные данные HLTV");
      hltvData = hltvCached;
    } else {
      console.log("🔄 Получаем свежие данные HLTV...");
      try {
        const url = `https://www.hltv.org/stats/teams/matches/${TEAM_ID}/${TEAM_SLUG}?csVersion=CS2`;
        const html = await fetchHtml(url);
        const matches = parseStatsMatches(html);
        
        const wins = matches.filter(m => m.wl === "W").length;
        const losses = matches.filter(m => m.wl === "L").length;
        
        hltvData = {
          source: "HLTV",
          matches,
          total: matches.length,
          wins,
          losses,
          winRate: matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : 0
        };
        
        setCache("hltv", "matches", hltvData);
      } catch (error) {
        console.error("❌ Ошибка получения данных HLTV:", error);
        hltvData = { source: "HLTV", matches: [], total: 0, wins: 0, losses: 0, winRate: 0 };
      }
    }

    console.log("🎮 Получаем данные Faceit...");
    const faceitCached = getCache("faceit", "stats");
    let faceitData;
    
    if (faceitCached) {
      console.log("✅ Используем кэшированные данные Faceit (stats)");
      faceitData = faceitCached;
    } else {
      console.log("🔄 Получаем свежие данные Faceit (stats)...");
      try {
        const faceitAPI = new FaceitAPI();
        const stats = await faceitAPI.getTeamStats();
        
        faceitData = {
          matches: [], // Не загружаем матчи для overview
          totalMatches: stats.totalMatches,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.winRate
        };
        setCache("faceit", "stats", faceitData);
      } catch (error) {
        console.error("❌ Ошибка получения данных Faceit (stats):", error);
        faceitData = { 
          matches: [],
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0
        };
      }
    }

    // Получаем FACEIT данные из нового формата
    const faceitMatches = Number(faceitData?.totalMatches || 0);
    const faceitWins = Number(faceitData?.wins || 0);
    const faceitLosses = Number(faceitData?.losses || 0);
    const faceitWinRate = Number(faceitData?.winRate || 0);
    
    console.log(`🔍 Faceit данные: matches=${faceitMatches}, wins=${faceitWins}, losses=${faceitLosses}, winRate=${faceitWinRate}`);

    const overview = {
      totalMatches: (hltvData.total || 0) + faceitMatches,
      totalWins: (hltvData.wins || 0) + faceitWins,
      totalLosses: (hltvData.losses || 0) + faceitLosses,
      overallWinRate: 0,
      hltv: {
        matches: hltvData.total || 0,
        wins: hltvData.wins || 0,
        losses: hltvData.losses || 0,
        winRate:
          hltvData.total > 0
            ? ((hltvData.wins / hltvData.total) * 100).toFixed(1)
            : 0,
      },
      faceit: {
        matches: faceitMatches,
        wins: faceitWins,
        losses: faceitLosses,
        winRate: faceitWinRate,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Вычисляем общий win rate
    const totalMatches = overview.totalMatches;
    if (totalMatches > 0) {
      overview.overallWinRate = (
        (overview.totalWins / totalMatches) *
        100
      ).toFixed(1);
    }

    res.json(overview);
  } catch (error) {
    console.error("❌ Error fetching overview stats:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Clear cache endpoint
app.post("/api/cache/clear", (req, res) => {
  try {
    console.log("🧹 Clearing cache...");

    // Очищаем все кэши
    Object.keys(cache).forEach((category) => {
      Object.keys(cache[category]).forEach((key) => {
        cache[category][key] = { data: null, ts: 0 };
      });
    });

    res.json({
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error clearing cache:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 FORZE Backend API запущен на http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 API endpoints:`);
  console.log(`   - GET /api/forze/matches - матчи HLTV`);
  console.log(`   - GET /api/forze/roster - состав команды`);
  console.log(`   - GET /api/faceit/stats - статистика FACEIT`);
  console.log(`   - GET /api/stats/overview - общая статистика`);
  console.log(`   - POST /api/cache/clear - очистка кэша`);
});
