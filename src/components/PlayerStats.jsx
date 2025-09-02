import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Person,
  Star,
  TrendingUp,
  Refresh,
  EmojiEvents,
  Timeline,
  SportsEsports,
  OpenInNew,
  Launch,
} from "@mui/icons-material";

const PlayerStats = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [hltvPlayers, setHltvPlayers] = useState([]);
  const [faceitPlayers, setFaceitPlayers] = useState([]);
  const [hltvLoading, setHltvLoading] = useState(true);
  const [faceitLoading, setFaceitLoading] = useState(true);
  const [hltvError, setHltvError] = useState(null);
  const [faceitError, setFaceitError] = useState(null);

  const fetchHltvPlayers = async () => {
    try {
      setHltvLoading(true);
      setHltvError(null);

      const response = await fetch("http://localhost:3001/api/forze/players");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHltvPlayers(data.players || []);
    } catch (err) {
      console.error("Error fetching HLTV players:", err);
      setHltvError(err.message);
    } finally {
      setHltvLoading(false);
    }
  };

  const fetchFaceitPlayers = async () => {
    try {
      setFaceitLoading(true);
      setFaceitError(null);

      const response = await fetch("http://localhost:3001/api/faceit/players");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFaceitPlayers(data.players || []);
    } catch (err) {
      console.error("Error fetching FACEIT players:", err);
      setFaceitError(err.message);
    } finally {
      setFaceitLoading(false);
    }
  };

  useEffect(() => {
    fetchHltvPlayers();
    fetchFaceitPlayers();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "STARTER":
        return "success";
      case "BENCHED":
        return "warning";
      default:
        return "default";
    }
  };

  const getRatingColor = (rating, source) => {
    const numRating = parseFloat(rating);
    if (source === "HLTV") {
      if (numRating >= 1.2) return "success";
      if (numRating >= 1.1) return "primary";
      if (numRating >= 1.0) return "warning";
      return "error";
    } else {
      // FACEIT ELO рейтинг для профессиональных игроков
      if (numRating >= 4000) return "success"; // Легендарный уровень
      if (numRating >= 3500) return "primary"; // Профессиональный уровень
      if (numRating >= 3000) return "secondary"; // Высокий профессиональный
      if (numRating >= 2500) return "info"; // Продвинутый уровень
      if (numRating >= 2000) return "warning"; // Хороший уровень
      if (numRating >= 1500) return "default"; // Средний уровень
      return "error"; // Низкий уровень
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case "HLTV":
        return <Timeline />;
      case "FACEIT":
        return <SportsEsports />;
      default:
        return <Timeline />;
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case "HLTV":
        return "primary";
      case "FACEIT":
        return "secondary";
      default:
        return "default";
    }
  };

  const renderPlayerTable = (players, source, loading, error) => {
    if (loading) {
      return (
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
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          Ошибка загрузки игроков {source}: {error}
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={source === "HLTV" ? fetchHltvPlayers : fetchFaceitPlayers}
              startIcon={<Refresh />}
            >
              Попробовать снова
            </Button>
          </Box>
        </Alert>
      );
    }

    if (players.length === 0) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          Нет данных об игроках {source}
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "grey.50" }}>
              <TableCell>
                <Typography variant="subtitle2">Игрок</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2">Статус</Typography>
              </TableCell>
                                      <TableCell align="center">
                          <Typography variant="subtitle2">
                            {source === "HLTV" ? "Рейтинг (30 дней)" : "ELO Рейтинг (Про)"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="subtitle2">Карты</Typography>
                        </TableCell>


              {source === "FACEIT" && (
                <TableCell align="center">
                  <Typography variant="subtitle2">Win Rate</Typography>
                </TableCell>
              )}
              <TableCell align="center">
                <Typography variant="subtitle2">Профиль</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((player) => (
              <TableRow
                key={player.id}
                sx={{
                  "&:nth-of-type(odd)": { backgroundColor: "grey.50" },
                  "&:hover": { backgroundColor: "grey.100" },
                }}
              >
                <TableCell>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Avatar sx={{ bgcolor: getSourceColor(source) }}>
                      {player.nickname ? player.nickname.charAt(0).toUpperCase() : "?"}
                    </Avatar>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {player.nickname}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={player.status}
                    color={getStatusColor(player.status)}
                    size="small"
                    icon={player.status === "STARTER" ? <Star /> : <Timeline />}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={player.rating30}
                    color={getRatingColor(player.rating30, source)}
                    size="small"
                    icon={<TrendingUp />}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
                    {player.stats?.maps || "0"}
                  </Typography>
                </TableCell>


                {source === "FACEIT" && (
                  <TableCell align="center">
                    <Typography variant="body2">
                      {player.stats?.winRate || "0.0"}%
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  {player.profileUrl && (
                    <Tooltip title="Открыть профиль">
                      <IconButton
                        size="small"
                        onClick={() => window.open(player.profileUrl, "_blank")}
                      >
                        <OpenInNew />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderStatsCards = (players, source) => {
    if (players.length === 0) return null;

    const total = players.length;
    const starters = players.filter((p) => p.status === "STARTER").length;
    const benched = players.filter((p) => p.status === "BENCHED").length;
    const averageRating = players.length > 0 
      ? (players.reduce((sum, p) => sum + parseFloat(p.rating30 || 0), 0) / players.length).toFixed(2)
      : "0.00";

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Всего игроков
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Основной состав
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "success.main" }}
              >
                {starters}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                В запасе
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "warning.main" }}
              >
                {benched}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="info.main" gutterBottom>
                Средний рейтинг
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "info.main" }}
              >
                {averageRating}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: "center" }}>
        <Person sx={{ mr: 1, verticalAlign: "middle" }} />
        Статистика игроков команды FORZE Reload
      </Typography>

      {/* Вкладки */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab 
            label="HLTV" 
            icon={<Timeline />} 
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab 
            label="FACEIT" 
            icon={<SportsEsports />} 
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Box>

      {/* Контент вкладок */}
      {activeTab === 0 && (
        <Box>
          {renderStatsCards(hltvPlayers, "HLTV")}
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ mb: 2, display: "flex", alignItems: "center" }}
              >
                <Timeline sx={{ mr: 1 }} />
                Статистика игроков команды FORZE Reload (HLTV)
              </Typography>
              {renderPlayerTable(hltvPlayers, "HLTV", hltvLoading, hltvError)}
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {renderStatsCards(faceitPlayers, "FACEIT")}
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ mb: 2, display: "flex", alignItems: "center" }}
              >
                <SportsEsports sx={{ mr: 1 }} />
                Статистика игроков команды FORZE Reload (FACEIT)
              </Typography>
              {renderPlayerTable(faceitPlayers, "FACEIT", faceitLoading, faceitError)}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Информация о команде */}
      <Paper elevation={1} sx={{ p: 3, mt: 3, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          <EmojiEvents sx={{ mr: 1, verticalAlign: "middle" }} />
          О команде FORZE Reload
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          FORZE Reload - российская профессиональная команда по Counter-Strike 2. 
          Команда участвует в международных турнирах и показывает высокие результаты.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Данные обновляются в реальном времени с официальных источников HLTV и FACEIT.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PlayerStats;
