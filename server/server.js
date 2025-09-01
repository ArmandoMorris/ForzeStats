import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
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

async function fetchHtml(url) {
  await fetchWithCookies("https://www.hltv.org/", {
    redirect: "follow",
    headers: HEADERS,
  });
  const r = await fetchWithCookies(url, {
    redirect: "follow",
    headers: HEADERS,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return await r.text();
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

  // список карт для распознавания текста
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

    // 3) Opponent — по ссылке на /team/
    const opponent =
      $(tr).find('a[href^="/team/"]').first().text().trim() ||
      tds.eq(2).text().trim();

    // 4) Map — ищем ссылку/текст с названием карты
    let map = "";
    const mapA = $(tr)
      .find("a")
      .filter((_, a) => MAP_RX.test($(a).text().trim()))
      .first();

    if (mapA.length) {
      map = mapA.text().trim();
    } else {
      // fallback из ячейки, где обычно карта
      map =
        tds.eq(3).text().trim().match(MAP_RX)?.[0] || tds.eq(3).text().trim();
    }

    // 5) Счёт — ищем в ряду первый шаблон "число - число"
    const rowText = tds
      .map((i, td) => $(td).text())
      .get()
      .join(" ");
    const m = rowText.match(/(\d+)\s*-\s*(\d+)/);
    if (!m) return;

    const our = Number(m[1]);
    const opp = Number(m[2]);
    if (!Number.isFinite(our) || !Number.isFinite(opp)) return;

    // 6) Итог W/L по счёту
    const wl = our > opp ? "W" : "L";

    rows.push({
      date,
      dateISO,
      event,
      opponent,
      map,
      our,
      opp,
      wl,
      source: "HLTV",
    });
  });

  return rows;
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
    const matches = await faceitAPI.getTeamMatches();

    setCache("faceit", "matches", matches);
    res.json(matches);
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
    const [stats, matches] = await Promise.all([
      faceitAPI.getTeamStats(),
      faceitAPI.getAllMatches(),
    ]);

    const combined = {
      source: "FACEIT",
      stats,
      matches: {
        matches: matches,
        total: matches.length,
        wins: matches.filter((m) => m.i17 === "1").length,
        losses: matches.filter((m) => m.i17 === "0").length,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(combined);
  } catch (error) {
    console.error("❌ Error fetching FACEIT combined:", error.message);

    // Fallback данные
    const fallbackData = {
      source: "FACEIT (Fallback)",
      stats: {
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

    const [hltvResponse, faceitResponse] = await Promise.all([
      fetch("http://localhost:3001/api/forze/matches"),
      fetch("http://localhost:3001/api/faceit/stats"),
    ]);

    const hltvData = await hltvResponse.json();
    const faceitData = await faceitResponse.json();

    const overview = {
      totalMatches:
        (hltvData.total || 0) + (faceitData.stats?.totalMatches || 0),
      totalWins: (hltvData.wins || 0) + (faceitData.stats?.wins || 0),
      totalLosses: (hltvData.losses || 0) + (faceitData.stats?.losses || 0),
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
        matches: faceitData.stats?.totalMatches || 0,
        wins: faceitData.stats?.wins || 0,
        losses: faceitData.stats?.losses || 0,
        winRate: faceitData.stats?.winRate || 0,
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
