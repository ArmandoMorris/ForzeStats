import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  EmojiEvents,
  Timeline,
  TableChart,
  Refresh,
} from "@mui/icons-material";
import MaterialChart from "./MaterialChart";
import MatchTable from "./MatchTable";

const OverviewStats = () => {
  const [overview, setOverview] = useState(null);
  const [hltvMatches, setHltvMatches] = useState([]);
  const [faceitStats, setFaceitStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, hltvRes, faceitRes] = await Promise.all([
        fetch("http://localhost:3001/api/stats/overview"),
        fetch("http://localhost:3001/api/forze/matches"),
        fetch("http://localhost:3001/api/faceit/stats"),
      ]);

      const overviewData = await overviewRes.json();
      const hltvData = await hltvRes.json();
      const faceitData = await faceitRes.json();

      setOverview(overviewData);
      setHltvMatches(hltvData.matches || []);
      setFaceitStats(faceitData);
    } catch (err) {
      console.error("Error fetching overview data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ошибка загрузки данных: {error}
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchData}
              startIcon={<Refresh />}
            >
              Попробовать снова
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  // Объединяем все матчи для отображения
  const allMatches = [
    ...(hltvMatches || []),
    ...(faceitStats?.matches?.matches || []),
  ].map((match, index) => ({
    ...match,
    id: match.id || `match_${index}`,
    source: match.source || "Unknown",
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: "center" }}>
        <EmojiEvents sx={{ mr: 2, verticalAlign: "middle" }} />
        Общая статистика FORZE Reload
      </Typography>

      {/* Основная статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Всего матчей
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: "bold" }}>
                {overview?.totalMatches || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Победы
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: "bold", color: "success.main" }}
              >
                {overview?.totalWins || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="error.main" gutterBottom>
                Поражения
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: "bold", color: "error.main" }}
              >
                {overview?.totalLosses || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="info.main" gutterBottom>
                % Побед
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: "bold", color: "info.main" }}
              >
                {overview?.overallWinRate || "0"}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Статистика по платформам */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <EmojiEvents sx={{ mr: 1 }} />
                HLTV Статистика
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Матчи
                  </Typography>
                  <Typography variant="h6">
                    {overview?.hltv?.matches || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Победы
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {overview?.hltv?.wins || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Поражения
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {overview?.hltv?.losses || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <EmojiEvents sx={{ mr: 1 }} />
                FACEIT Статистика
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Матчи
                  </Typography>
                  <Typography variant="h6">
                    {overview?.faceit?.matches || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Победы
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {overview?.faceit?.wins || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    % Побед
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {overview?.faceit?.winRate || "0%"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Графики */}
      {allMatches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Графики статистики (все матчи)
          </Typography>
          <MaterialChart
            matches={allMatches}
            showTitle={false}
            showStats={false}
            showChips={false}
          />
        </Box>
      )}

      {/* Кнопка показать/скрыть таблицу */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setShowTable(!showTable)}
          startIcon={showTable ? <Timeline /> : <TableChart />}
          size="large"
        >
          {showTable
            ? "Скрыть таблицу всех матчей"
            : "Показать таблицу всех матчей"}
        </Button>
      </Box>

      {/* Таблица всех матчей */}
      {showTable && allMatches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Все матчи (HLTV + FACEIT)
          </Typography>
          <MatchTable matches={allMatches} />
        </Box>
      )}

      {/* Информация о платформах */}
      <Paper elevation={1} sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          <EmojiEvents sx={{ mr: 1, verticalAlign: "middle" }} />
          Источники данных
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>HLTV:</strong> Официальные турнирные матчи и статистика
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>FACEIT:</strong> Соревновательные матчи на платформе
              FACEIT
            </Typography>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Данные обновляются в реальном времени с официальных источников.
        </Typography>
      </Paper>
    </Container>
  );
};

export default OverviewStats;
