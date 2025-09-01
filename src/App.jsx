// src/App.jsx
import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Box,
  Button,
  Container,
  Typography,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import { Refresh, Settings, Info } from "@mui/icons-material";
import WinLossLineChart from "./components/WinLossLineChart";
import SimpleChart from "./components/SimpleChart";
import MaterialChart from "./components/MaterialChart";
import MatchTable from "./components/MatchTable";
import FaceitStats from "./components/FaceitStats";
import GooeyNav from "./components/GooeyNav";
import ErrorBoundary from "./components/ErrorBoundary";
import OverviewStats from "./components/OverviewStats";
import PlayerStats from "./components/PlayerStats";

// Создаем улучшенную тему Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
  },
});

function App() {
  console.log("App component is rendering...");

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  // Тестовые данные для проверки работы компонентов
  const testMatches = [
    {
      id: 1,
      date: "01.12.2024",
      event: "Test Tournament",
      opponent: "Test Team",
      result: "16:14",
      wl: "W",
      source: "HLTV",
    },
    {
      id: 2,
      date: "02.12.2024",
      event: "Test Tournament",
      opponent: "Another Team",
      result: "14:16",
      wl: "L",
      source: "HLTV",
    },
    {
      id: 3,
      date: "03.12.2024",
      event: "Another Tournament",
      opponent: "Third Team",
      result: "16:10",
      wl: "W",
      source: "HLTV",
    },
  ];

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchMatches = async () => {
    try {
      console.log("Начинаем загрузку данных...");
      setLoading(true);
      setError(null);

      // Загружаем только HLTV данные для основной вкладки
      const response = await fetch("http://localhost:3001/api/forze/matches");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("HLTV данные получены:", data);
      console.log("Количество матчей:", data.matches ? data.matches.length : 0);

      setMatches(data.matches || []);
      setLastUpdate(new Date());

      if (data.matches && data.matches.length > 0) {
        showSnackbar(`Загружено ${data.matches.length} матчей HLTV`, "success");
      }
    } catch (err) {
      console.error("Ошибка при получении данных:", err);
      console.log("Используем тестовые данные...");
      setMatches(testMatches);
      setError(null);
      showSnackbar(
        "Используются тестовые данные (сервер недоступен)",
        "warning"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/cache/clear", {
        method: "POST",
      });

      if (response.ok) {
        showSnackbar("Кэш очищен", "success");
        // Перезагружаем данные
        await fetchMatches();
      } else {
        showSnackbar("Ошибка при очистке кэша", "error");
      }
    } catch (err) {
      console.error("Ошибка при очистке кэша:", err);
      showSnackbar("Ошибка при очистке кэша", "error");
    }
  };

  useEffect(() => {
    console.log("App useEffect triggered");
    fetchMatches();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowTable(false); // Скрываем таблицу при смене вкладки
  };

  console.log(
    "App render - loading:",
    loading,
    "error:",
    error,
    "matches count:",
    matches.length
  );

  if (loading) {
    console.log("Rendering loading state");
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
        >
          <Typography variant="h4" color="primary">
            Загрузка данных...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Получаем статистику команды FORZE Reload
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    console.log("Rendering error state");
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Статистика команды FORZE Reload
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="h6">Ошибка загрузки данных:</Typography>
            <Typography>{error}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Убедитесь, что сервер запущен на порту 3001
            </Typography>
          </Alert>
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button
              variant="contained"
              onClick={fetchMatches}
              startIcon={<Refresh />}
            >
              Попробовать снова
            </Button>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  console.log("Rendering main content");
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl">
        {/* Заголовок с кнопками управления */}
        <Box
          sx={{
            mt: 4,
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h3" component="h1" sx={{ fontWeight: "bold" }}>
            Статистика команды FORZE Reload
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={clearCache}
              startIcon={<Settings />}
              size="small"
            >
              Очистить кэш
            </Button>
            <Button
              variant="outlined"
              onClick={fetchMatches}
              startIcon={<Refresh />}
              size="small"
            >
              Обновить
            </Button>
          </Box>
        </Box>

        {/* Информация о последнем обновлении */}
        {lastUpdate && (
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Последнее обновление: {lastUpdate.toLocaleString("ru-RU")}
            </Typography>
          </Box>
        )}

        <GooeyNav activeTab={activeTab} onTabChange={handleTabChange} />

        {activeTab === "overview" ? (
          <ErrorBoundary>
            <OverviewStats />
          </ErrorBoundary>
        ) : activeTab === "hltv" ? (
          <>
                         <Box sx={{ mt: 3, mb: 2, textAlign: "center" }}>
               <Typography variant="h6" color="primary">
                 Загружено матчей HLTV: {matches.length}
               </Typography>
               {matches.length === 3 && (
                 <Alert severity="warning" sx={{ mt: 1 }}>
                   Используются тестовые данные (сервер недоступен)
                 </Alert>
               )}
             </Box>

            <ErrorBoundary>
              <MaterialChart matches={matches} />
            </ErrorBoundary>

            {/* Кнопка переключения таблицы */}
            <Box sx={{ textAlign: "center", mt: 4, mb: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => setShowTable(!showTable)}
              >
                {showTable
                  ? "Скрыть таблицу матчей"
                  : "Показать таблицу матчей"}
              </Button>
            </Box>

            {/* Таблица матчей */}
            {showTable && (
              <ErrorBoundary>
                <MatchTable matches={matches} />
              </ErrorBoundary>
            )}
          </>
        ) : activeTab === "players" ? (
          <ErrorBoundary>
            <PlayerStats />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <FaceitStats />
          </ErrorBoundary>
        )}

        {/* Snackbar для уведомлений */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App;
