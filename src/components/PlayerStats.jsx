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
} from "@mui/material";
import {
  Person,
  Star,
  TrendingUp,
  Refresh,
  EmojiEvents,
  Timeline,
} from "@mui/icons-material";

const PlayerStats = () => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:3001/api/forze/roster");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRoster(data.roster || []);
    } catch (err) {
      console.error("Error fetching roster:", err);
      setError(err.message);

      // Тестовые данные
      setRoster([
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
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

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
        Ошибка загрузки состава: {error}
        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchRoster}
            startIcon={<Refresh />}
          >
            Попробовать снова
          </Button>
        </Box>
      </Alert>
    );
  }

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

  const getRatingColor = (rating) => {
    const numRating = parseFloat(rating);
    if (numRating >= 1.2) return "success";
    if (numRating >= 1.1) return "primary";
    if (numRating >= 1.0) return "warning";
    return "error";
  };

  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: "center" }}>
        <Person sx={{ mr: 1, verticalAlign: "middle" }} />
        Состав команды FORZE Reload
      </Typography>

      {/* Статистика команды */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Всего игроков
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {roster.length}
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
                {roster.filter((p) => p.status === "STARTER").length}
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
                {roster.filter((p) => p.status === "BENCHED").length}
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
                {(
                  roster.reduce(
                    (sum, p) => sum + parseFloat(p.rating30 || 0),
                    0
                  ) / roster.length
                ).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица игроков */}
      <Card elevation={2}>
        <CardContent>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ mb: 2, display: "flex", alignItems: "center" }}
          >
            <EmojiEvents sx={{ mr: 1 }} />
            Детальная статистика игроков
          </Typography>

          <TableContainer>
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
                      Рейтинг (30 дней)
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2">Действия</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roster.map((player) => (
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
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <Person />
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
                        icon={
                          player.status === "STARTER" ? <Star /> : <Timeline />
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={player.rating30}
                        color={getRatingColor(player.rating30)}
                        size="small"
                        icon={<TrendingUp />}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          console.log("Player details:", player);
                        }}
                      >
                        Детали
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Информация о команде */}
      <Paper elevation={1} sx={{ p: 3, mt: 3, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          <EmojiEvents sx={{ mr: 1, verticalAlign: "middle" }} />О команде FORZE
          Reload
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          FORZE Reload - российская профессиональная команда по Counter-Strike
          2. Команда участвует в международных турнирах и показывает высокие
          результаты.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Данные обновляются в реальном времени с официальных источников HLTV.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PlayerStats;
