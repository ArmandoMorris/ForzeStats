import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Timeline,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const MaterialChart = ({ matches = [], showTitle = true, showStats = true, showChips = true }) => {
  console.log('MaterialChart render - matches:', matches);

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography variant="h6" color="text.secondary">
          Нет данных для отображения графика
        </Typography>
      </Box>
    );
  }

  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('all');

  // Сортируем матчи по дате (от старых к новым)
  const sortedMatches = useMemo(() => {
    try {
      return [...matches].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const [dayA, monthA, yearA] = a.date.includes('.') ? a.date.split('.').map(Number) : a.date.split('/').map(Number);
        const [dayB, monthB, yearB] = b.date.includes('.') ? b.date.split('.').map(Number) : b.date.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
      });
    } catch (error) {
      console.error('Ошибка при сортировке:', error);
      return matches;
    }
  }, [matches]);

  // Функция для фильтрации данных по временному диапазону
  const filterMatchesByTimeRange = (matches, range) => {
    if (range === 'all') return matches;
    
    const now = new Date();
    const filteredMatches = matches.filter(match => {
      try {
        const [day, month, year] = match.date.includes('.') ? match.date.split('.').map(Number) : match.date.split('/').map(Number);
        const matchDate = new Date(year, month - 1, day);
        
        if (range === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return matchDate >= monthAgo;
        } else if (range === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return matchDate >= weekAgo;
        }
        return true;
      } catch (error) {
        return false;
      }
    });
    
    return filteredMatches;
  };

  // Фильтруем данные по временному диапазону
  const filteredMatches = filterMatchesByTimeRange(sortedMatches, timeRange);

  // Подготавливаем данные для графика с накопительной статистикой
  const chartData = filteredMatches.map((match, index) => {
    try {
      // Рассчитываем накопительную статистику
      const matchesSoFar = filteredMatches.slice(0, index + 1);
      const winsSoFar = matchesSoFar.filter(m => m.wl === 'W').length;
      const winRateSoFar = matchesSoFar.length > 0 ? (winsSoFar / matchesSoFar.length) * 100 : 0;
      
      return {
        date: match.date || 'Неизвестная дата',
        result: match.wl === 'W' ? 1 : 0,
        win: match.wl === 'W' ? 1 : 0,
        loss: match.wl === 'L' ? 1 : 0,
        winRate: parseFloat(winRateSoFar.toFixed(1)),
        event: match.event || 'Неизвестный турнир',
        opponent: match.opponent || 'Неизвестный противник',
        resultScore: match.result || 'N/A',
        wl: match.wl || 'N/A',
        map: match.map || 'N/A',
        index: index,
        matchNumber: index + 1
      };
    } catch (error) {
      console.error('Ошибка при подготовке данных матча:', error, match);
      return {
        date: 'Ошибка',
        result: 0,
        win: 0,
        loss: 0,
        winRate: 0,
        event: 'Ошибка',
        opponent: 'Ошибка',
        resultScore: 'N/A',
        wl: 'N/A',
        map: 'N/A',
        index: index,
        matchNumber: index + 1
      };
    }
  });

  // Рассчитываем статистику
  const stats = useMemo(() => {
    const totalMatches = filteredMatches.length;
    const wins = filteredMatches.filter(match => match.wl === 'W').length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';
    
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    filteredMatches.forEach(match => {
      if (match.wl === 'W') {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    });
    
    return {
      totalMatches,
      wins,
      losses,
      winRate,
      maxWinStreak,
      maxLossStreak,
      currentStreak: currentWinStreak > 0 ? currentWinStreak : -currentLossStreak
    };
  }, [filteredMatches]);

  // Функция для подготовки данных для круговой диаграммы
  const preparePieData = (matches) => {
    const wins = matches.filter(match => match.wl === 'W').length;
    const losses = matches.filter(match => match.wl === 'L').length;
    
    return [
      { name: 'Победы', value: wins, fill: '#4caf50' },
      { name: 'Поражения', value: losses, fill: '#f44336' }
    ];
  };

  // Функция для подготовки данных для столбчатой диаграммы по турнирам
  const prepareTournamentData = (matches) => {
    const tournamentStats = {};
    
    matches.forEach(match => {
      const event = match.event || 'Неизвестный турнир';
      if (!tournamentStats[event]) {
        tournamentStats[event] = { wins: 0, losses: 0, total: 0 };
      }
      tournamentStats[event].total++;
      if (match.wl === 'W') {
        tournamentStats[event].wins++;
      } else {
        tournamentStats[event].losses++;
      }
    });
    
    return Object.entries(tournamentStats)
      .map(([event, stats]) => ({
        tournament: event,
        wins: stats.wins,
        losses: stats.losses,
        total: stats.total,
        winRate: ((stats.wins / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Показываем только топ-10 турниров
  };

  const pieData = preparePieData(filteredMatches);
  const tournamentData = prepareTournamentData(filteredMatches);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper elevation={3} sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Матч #{data.matchNumber} - {data.date}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Турнир: {data.event}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Противник: {data.opponent}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Карта: {data.map}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Счёт: {data.resultScore}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Накопительный % побед: {data.winRate}%
          </Typography>
          <Chip
            label={data.wl === 'W' ? 'Победа' : 'Поражение'}
            color={data.wl === 'W' ? 'success' : 'error'}
            size="small"
            sx={{ mt: 1 }}
          />
        </Paper>
      );
    }
    return null;
  };

  const renderChart = () => {
    const chartHeight = 400;

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="matchNumber" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                interval={Math.max(0, Math.floor(chartData.length / 15))}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => chartData[value - 1]?.date || value}
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="winRate"
                name="Процент побед (накопительно)"
                stroke="#2196f3"
                strokeWidth={3}
                dot={{ r: 3, fill: '#2196f3' }}
                isAnimationActive={false}
                activeDot={{ r: 6, fill: '#fff', stroke: '#2196f3', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="matchNumber" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                interval={Math.max(0, Math.floor(chartData.length / 15))}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => chartData[value - 1]?.date || value}
              />
              <YAxis 
                domain={[0, 1]}
                tickCount={3}
                tickFormatter={(value) => value === 1 ? 'W' : (value === 0 ? 'L' : value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="win"
                name="Победы"
                fill="#4caf50"
              />
              <Bar
                dataKey="loss"
                name="Поражения"
                fill="#f44336"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'tournament':
        return (
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: Math.max(800, tournamentData.length * 120) }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={tournamentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="tournament" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'wins') return [value, 'Победы'];
                      if (name === 'losses') return [value, 'Поражения'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Турнир: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="wins" name="Победы" fill="#4caf50" />
                  <Bar dataKey="losses" name="Поражения" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {showTitle && (
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Статистика команды FORZE Reload
        </Typography>
      )}
      
      {/* Элементы управления */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Тип графика</InputLabel>
                <Select
                  value={chartType}
                  label="Тип графика"
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <MenuItem value="line">
                    <Timeline sx={{ mr: 1 }} />
                    Линейный график
                  </MenuItem>
                  <MenuItem value="bar">
                    <BarChartIcon sx={{ mr: 1 }} />
                    Столбчатая диаграмма
                  </MenuItem>
                  <MenuItem value="pie">
                    <PieChartIcon sx={{ mr: 1 }} />
                    Круговая диаграмма
                  </MenuItem>
                  <MenuItem value="tournament">
                    <EmojiEvents sx={{ mr: 1 }} />
                    По турнирам
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Период</InputLabel>
                <Select
                  value={timeRange}
                  label="Период"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="all">Все время</MenuItem>
                  <MenuItem value="month">Последний месяц</MenuItem>
                  <MenuItem value="week">Последняя неделя</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {showChips && (
              <Grid item xs={12} md={6}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip 
                    label={`Всего матчей: ${stats.totalMatches}`} 
                    color="primary" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`Победы: ${stats.wins}`} 
                    color="success" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`Поражения: ${stats.losses}`} 
                    color="error" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`Процент побед: ${stats.winRate}%`} 
                    color="info" 
                    variant="outlined" 
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {showStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  Всего матчей
                </Typography>
                <Typography variant="h4" component="div" color="primary">
                  {stats.totalMatches}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  Победы
                </Typography>
                <Typography variant="h4" component="div" color="success.main">
                  {stats.wins}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  Поражения
                </Typography>
                <Typography variant="h4" component="div" color="error.main">
                  {stats.losses}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  Процент побед
                </Typography>
                <Typography variant="h4" component="div" color="info.main">
                  {stats.winRate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* График */}
      <Card>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MaterialChart;
