// src/App.jsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Button, Container, Typography, Alert } from '@mui/material';
import WinLossLineChart from './components/WinLossLineChart';
import SimpleChart from './components/SimpleChart';
import MaterialChart from './components/MaterialChart';
import MatchTable from './components/MatchTable';
import FaceitStats from './components/FaceitStats';
import GooeyNav from './components/GooeyNav';
import ErrorBoundary from './components/ErrorBoundary';
// Создаем тему Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  console.log('App component is rendering...');
  
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [activeTab, setActiveTab] = useState('hltv');

  // Тестовые данные для проверки работы компонентов
  const testMatches = [
    {
      id: 1,
      date: '01.12.2024',
      event: 'Test Tournament',
      opponent: 'Test Team',
      result: '16:14',
      wl: 'W'
    },
    {
      id: 2,
      date: '02.12.2024',
      event: 'Test Tournament',
      opponent: 'Another Team',
      result: '14:16',
      wl: 'L'
    },
    {
      id: 3,
      date: '03.12.2024',
      event: 'Another Tournament',
      opponent: 'Third Team',
      result: '16:10',
      wl: 'W'
    }
  ];

  useEffect(() => {
    console.log('App useEffect triggered');
    const fetchMatches = async () => {
      try {
        console.log('Начинаем загрузку данных...');
        const response = await fetch('http://localhost:3001/api/forze/matches');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Данные получены:', data);
        console.log('Количество матчей:', data.matches ? data.matches.length : 0);
        console.log('Первый матч:', data.matches ? data.matches[0] : 'нет данных');
        setMatches(data.matches || []);
      } catch (err) {
        console.error('Ошибка при получении данных:', err);
        console.log('Используем тестовые данные...');
        setMatches(testMatches);
        setError(null); // Убираем ошибку, так как используем тестовые данные
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowTable(false); // Скрываем таблицу при смене вкладки
  };

  console.log('App render - loading:', loading, 'error:', error, 'matches count:', matches.length);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
        >
          <Typography variant="h4">Загрузка данных...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    console.log('Rendering error state');
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
        </Container>
      </ThemeProvider>
    );
  }

  console.log('Rendering main content');
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl">
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mt: 4, mb: 2 }}>
          Статистика команды FORZE Reload
        </Typography>
        
        <GooeyNav activeTab={activeTab} onTabChange={handleTabChange} />
      
        {activeTab === 'hltv' ? (
          <>
            <Box sx={{ mt: 3, mb: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                Загружено матчей: {matches.length}
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
            <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => setShowTable(!showTable)}
              >
                {showTable ? 'Скрыть таблицу матчей' : 'Показать таблицу матчей'}
              </Button>
            </Box>

            {/* Таблица матчей */}
            {showTable && (
              <ErrorBoundary>
                <MatchTable matches={matches} />
              </ErrorBoundary>
            )}
          </>
        ) : (
          <ErrorBoundary>
            <FaceitStats />
          </ErrorBoundary>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;