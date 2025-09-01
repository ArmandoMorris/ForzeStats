import React, { useState, useEffect } from 'react';
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
  Container
} from '@mui/material';
import { TrendingUp, TrendingDown, EmojiEvents, Timeline, TableChart } from '@mui/icons-material';
import MaterialChart from './MaterialChart';
import MatchTable from './MatchTable';

const FaceitStats = () => {
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const fetchFaceitData = async () => {
      try {
        setLoading(true);
        
        // Загружаем статистику и матчи отдельно
        const [statsResp, matchesResp] = await Promise.all([
          fetch('http://localhost:3001/api/faceit/stats'),
          fetch('http://localhost:3001/api/faceit/matches')
        ]);
        
        if (!statsResp.ok) {
          throw new Error(`HTTP ${statsResp.status}: ${statsResp.statusText}`);
        }
        
        if (!matchesResp.ok) {
          throw new Error(`HTTP ${matchesResp.status}: ${matchesResp.statusText}`);
        }
        
        const statsData = await statsResp.json();
        const matchesData = await matchesResp.json();
        
        console.log('FACEIT stats received:', statsData);
        console.log('FACEIT matches received:', matchesData);

        const rawMatches = matchesData.matches || [];
        
        // Используем статистику из API, а не вычисляем из матчей
        const stats = {
          totalMatches: statsData.totalMatches || 0,
          wins: statsData.wins || 0,
          losses: statsData.losses || 0,
          winRate: statsData.winRate || 0
        };

        // Трансформируем матчи в формат, совместимый с графиками/таблицей
        const transformedMatches = rawMatches.map((match) => {
          const isWin = match.wl === 'W';
          const d = new Date(match.dateISO);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const formattedDate = `${dd}.${mm}.${yyyy}`;
          return {
            date: formattedDate,
            wl: match.wl,
            result: match.result,
            opponent: match.opponent,
            map: match.map,
            event: match.event,
            our: match.our,
            opp: match.opp,
            source: match.source
          };
        });

        setStats(statsData);
        setMatches(transformedMatches);
        setError(null);
      } catch (err) {
        console.error('Error fetching FACEIT data:', err);
        setError(err.message);
        setStats({
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0
        });
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFaceitData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Ошибка загрузки данных FACEIT: {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Статистика команды FORZE Reload на FACEIT
        {stats && (
          <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
            Всего матчей: {stats.totalMatches} | Загружено для отображения: {matches.length}
          </Typography>
        )}
      </Typography>

      {/* Основная статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Всего матчей
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats?.totalMatches || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Победы
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {stats?.wins || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error.main" gutterBottom>
                Поражения
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {stats?.losses || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="info.main" gutterBottom>
                Процент побед
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {stats?.winRate ? `${stats.winRate}%` : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Последние матчи */}
      {matches && matches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Последние матчи (показано {matches.length} из {stats?.totalMatches || 0})
          </Typography>
          <Grid container spacing={2}>
            {matches.slice(0, 6).map((match, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {match.date}
                      </Typography>
                      <Chip 
                        label={match.wl === 'W' ? 'Победа' : 'Поражение'}
                        color={match.wl === 'W' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {match.opponent}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Карта: {match.map}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Счет: {match.result}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {match.event}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Графики */}
      {matches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Графики статистики
          </Typography>
          <MaterialChart matches={matches} showTitle={false} showStats={false} showChips={false} />
        </Box>
      )}

      {/* Кнопка показать/скрыть таблицу */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setShowTable(!showTable)}
          startIcon={showTable ? <Timeline /> : <TableChart />}
          size="large"
        >
          {showTable ? 'Скрыть таблицу матчей' : 'Показать таблицу матчей'}
        </Button>
      </Box>

      {/* Таблица матчей */}
      {showTable && matches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Все матчи FACEIT
          </Typography>
          <MatchTable matches={matches} />
        </Box>
      )}

      {/* Информация о платформе */}
      <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
          FACEIT - Платформа для соревновательных матчей
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Все матчи загружены с официального API FACEIT. 
          Статистика обновляется в реальном времени.
        </Typography>
      </Paper>
    </Container>
  );
};

export default FaceitStats;
