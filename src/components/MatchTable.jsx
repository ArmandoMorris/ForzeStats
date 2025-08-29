// src/components/MatchTable.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  UnfoldMore,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

const MatchTable = ({ matches }) => {
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [filterMap, setFilterMap] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 25;

  // Функция для сортировки
  const sortedAndFilteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Фильтрация по турниру
    if (filterEvent) {
      filtered = filtered.filter(match => 
        match.event.toLowerCase().includes(filterEvent.toLowerCase())
      );
    }

    // Фильтрация по результату
    if (filterResult !== 'all') {
      filtered = filtered.filter(match => match.wl === filterResult);
    }

    // Фильтрация по карте
    if (filterMap) {
      filtered = filtered.filter(match => 
        match.map.toLowerCase().includes(filterMap.toLowerCase())
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date.split('.').reverse().join('-'));
          bValue = new Date(b.date.split('.').reverse().join('-'));
          break;
        case 'event':
          aValue = a.event.toLowerCase();
          bValue = b.event.toLowerCase();
          break;
        case 'opponent':
          aValue = a.opponent.toLowerCase();
          bValue = b.opponent.toLowerCase();
          break;
        case 'map':
          aValue = a.map.toLowerCase();
          bValue = b.map.toLowerCase();
          break;
        case 'result':
          aValue = a.result;
          bValue = b.result;
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [matches, sortField, sortDirection, filterEvent, filterResult, filterMap]);

  // Пагинация
  const paginatedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * matchesPerPage;
    const endIndex = startIndex + matchesPerPage;
    return sortedAndFilteredMatches.slice(startIndex, endIndex);
  }, [sortedAndFilteredMatches, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredMatches.length / matchesPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEvent, filterResult, filterMap, sortField, sortDirection]);

  const getSortIcon = (field) => {
    if (sortField !== field) return <UnfoldMore />;
    return sortDirection === 'asc' ? <ArrowUpward /> : <ArrowDownward />;
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 3 }}>
        Детальная таблица матчей
      </Typography>

      {/* Фильтры */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              label="Поиск по турниру"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              placeholder="Введите название турнира..."
              size="small"
              sx={{ minWidth: 250 }}
            />
            <TextField
              label="Поиск по карте"
              value={filterMap}
              onChange={(e) => setFilterMap(e.target.value)}
              placeholder="Введите название карты..."
              size="small"
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Результат</InputLabel>
              <Select
                value={filterResult}
                label="Результат"
                onChange={(e) => setFilterResult(e.target.value)}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="W">Победы</MenuItem>
                <MenuItem value="L">Поражения</MenuItem>
              </Select>
            </FormControl>
            <Chip 
              label={`Показано: ${paginatedMatches.length} из ${sortedAndFilteredMatches.length} (всего: ${matches.length})`} 
              color="primary" 
              variant="outlined" 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Таблица */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Tooltip title="Сортировать по дате">
                  <IconButton size="small" onClick={() => handleSort('date')}>
                    {getSortIcon('date')}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Дата
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="Сортировать по турниру">
                  <IconButton size="small" onClick={() => handleSort('event')}>
                    {getSortIcon('event')}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Турнир
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="Сортировать по противнику">
                  <IconButton size="small" onClick={() => handleSort('opponent')}>
                    {getSortIcon('opponent')}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Противник
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="Сортировать по карте">
                  <IconButton size="small" onClick={() => handleSort('map')}>
                    {getSortIcon('map')}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Карта
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Tooltip title="Сортировать по счёту">
                  <IconButton size="small" onClick={() => handleSort('result')}>
                    {getSortIcon('result')}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Счёт
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2">
                  Результат
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
                     <TableBody>
             {paginatedMatches.map((match, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  '&:nth-of-type(odd)': { backgroundColor: 'grey.50' },
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                <TableCell>
                  <Typography variant="body2">
                    {match.date}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {match.event}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                    {match.opponent}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                    {match.map}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight="bold">
                    {match.result}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {match.wl === 'W' ? (
                    <Chip
                      icon={<CheckCircle />}
                      label="Победа"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      icon={<Cancel />}
                      label="Поражение"
                      color="error"
                      size="small"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
                 </Table>
       </TableContainer>

       {/* Пагинация */}
       {totalPages > 1 && (
         <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
           <Pagination
             count={totalPages}
             page={currentPage}
             onChange={handlePageChange}
             color="primary"
             size="large"
             showFirstButton
             showLastButton
           />
         </Box>
       )}

       {/* Сообщение если нет данных */}
       {sortedAndFilteredMatches.length === 0 && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 3, 
            textAlign: 'center',
            backgroundColor: 'grey.50',
            borderRadius: 1
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Нет матчей, соответствующих выбранным фильтрам
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MatchTable;