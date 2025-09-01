// src/components/MatchTable.jsx
import React, { useState, useMemo } from "react";
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
  Pagination,
} from "@mui/material";
import {
   ArrowUpward,
   ArrowDownward,
   UnfoldMore,
   CheckCircle,
   Cancel,
   Timeline,
   SportsEsports,
 } from "@mui/icons-material";

const MatchTable = ({ matches }) => {
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterResult, setFilterResult] = useState("all");

  const [filterSource, setFilterSource] = useState("all");
     const [currentPage, setCurrentPage] = useState(1);
   const matchesPerPage = 25;

  // Функция для сортировки
  const sortedAndFilteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Фильтрация по турниру
    if (filterEvent) {
      filtered = filtered.filter((match) =>
        match.event.toLowerCase().includes(filterEvent.toLowerCase())
      );
    }

    // Фильтрация по результату
    if (filterResult !== "all") {
      filtered = filtered.filter((match) => match.wl === filterResult);
    }



    // Фильтрация по источнику
    if (filterSource !== "all") {
      filtered = filtered.filter((match) => match.source === filterSource);
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "date":
          aValue = new Date(a.date.split(".").reverse().join("-"));
          bValue = new Date(b.date.split(".").reverse().join("-"));
          break;
        case "event":
          aValue = a.event.toLowerCase();
          bValue = b.event.toLowerCase();
          break;
        case "opponent":
          aValue = a.opponent.toLowerCase();
          bValue = b.opponent.toLowerCase();
          break;

        case "result":
          aValue = a.result;
          bValue = b.result;
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [
    matches,
    sortField,
    sortDirection,
    filterEvent,
    filterResult,
    filterSource,
  ]);

  const totalPages = Math.ceil(sortedAndFilteredMatches.length / matchesPerPage);
  const startIndex = (currentPage - 1) * matchesPerPage;
  const paginatedMatches = sortedAndFilteredMatches.slice(
    startIndex,
    startIndex + matchesPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

     const handlePageChange = (event, newPage) => {
     setCurrentPage(newPage);
   };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <UnfoldMore fontSize="small" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpward fontSize="small" />
    ) : (
      <ArrowDownward fontSize="small" />
    );
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

  // Получение уникальных значений для фильтров
  const uniqueEvents = [...new Set(matches.map((match) => match.event))];
  const uniqueSources = [...new Set(matches.map((match) => match.source))];

  return (
    <Box>
      {/* Фильтры */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Фильтры и поиск
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 2,
            }}
          >
            <TextField
              label="Поиск по турниру"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              size="small"
            />
            <FormControl size="small">
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

            <FormControl size="small">
              <InputLabel>Источник</InputLabel>
              <Select
                value={filterSource}
                label="Источник"
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <MenuItem value="all">Все</MenuItem>
                {uniqueSources.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Статистика фильтров */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Показано {sortedAndFilteredMatches.length} из {matches.length} матчей
      </Typography>

      {/* Таблица */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
                     <TableHead>
             <TableRow sx={{ backgroundColor: "grey.50" }}>
              <TableCell>
                <Tooltip title="Сортировать по дате">
                  <IconButton size="small" onClick={() => handleSort("date")}>
                    {getSortIcon("date")}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Дата
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="Сортировать по турниру">
                  <IconButton size="small" onClick={() => handleSort("event")}>
                    {getSortIcon("event")}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Турнир
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title="Сортировать по противнику">
                  <IconButton
                    size="small"
                    onClick={() => handleSort("opponent")}
                  >
                    {getSortIcon("opponent")}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Противник
                </Typography>
              </TableCell>

              <TableCell align="center">
                <Tooltip title="Сортировать по результату">
                  <IconButton size="small" onClick={() => handleSort("result")}>
                    {getSortIcon("result")}
                  </IconButton>
                </Tooltip>
                <Typography variant="subtitle2" component="span">
                  Счет
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" component="span">
                  Результат
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" component="span">
                  Источник
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                         {paginatedMatches.map((match, index) => {
              
              return (
                <React.Fragment key={index}>
                                     <TableRow
                     sx={{
                       "&:nth-of-type(odd)": { backgroundColor: "grey.50" },
                       "&:hover": { backgroundColor: "grey.100" },
                     }}
                   >
                    <TableCell>
                      <Typography variant="body2">{match.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{match.event}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {match.opponent}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {match.result}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {match.wl === "W" ? (
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
                    <TableCell align="center">
                      <Chip
                        icon={getSourceIcon(match.source)}
                        label={match.source || "Unknown"}
                        color={getSourceColor(match.source)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                                     </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Пагинация */}
      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
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
            textAlign: "center",
            backgroundColor: "grey.50",
            borderRadius: 1,
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
