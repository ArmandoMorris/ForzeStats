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
        
        // Загружаем комбинированные данные (стата + матчи) одним запросом
        const resp = await fetch('http://localhost:3001/api/faceit/combined');
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        const combined = await resp.json();
        console.log('FACEIT combined received:', combined);

        const statsData = combined.stats;
        const rawMatches = combined.matches?.matches || [];

        // Трансформируем матчи в формат, совместимый с графиками/таблицей
        const transformedMatches = rawMatches.map((match) => {
          const isWin = match.i17 === '1';
          const d = new Date(match.date);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const formattedDate = `${dd}.${mm}.${yyyy}`;
          return {
            date: formattedDate,
            wl: isWin ? 'W' : 'L',
            result: match.i18 || 'N/A',
            opponent: 'FACEIT',
            map: match.i1 || 'Unknown',
            event: 'FACEIT Match',
          };
        });

        setStats(statsData);
        setMatches(transformedMatches);
        setError(null);
      } catch (err) {
        console.error('Error fetching FACEIT data:', err);
        setError(err.message);
        setStats({
          teamStats: {
            'Total Matches': '0',
            'Wins': '0',
            'Losses': '0',
            'Win Rate': '0%'
          },
          recentMatches: []
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
                {stats?.teamStats['Total Matches'] || '0'}
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
                {stats?.teamStats['Wins'] || '0'}
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
                {stats?.teamStats['Losses'] || '0'}
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
                {stats?.teamStats['Win Rate'] || '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Последние матчи */}
      {stats?.recentMatches && stats.recentMatches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Последние матчи
          </Typography>
          <Grid container spacing={2}>
            {stats.recentMatches.map((match, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {match.date}
                      </Typography>
                      <Chip 
                        label={match.result === 'W' ? 'Победа' : 'Поражение'}
                        color={match.result === 'W' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {match.map}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Счет: {match.score}
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
