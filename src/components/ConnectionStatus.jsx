import React, { useState, useEffect } from "react";
import {
  Box,
  Chip,
  Typography,
  Tooltip,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  Wifi,
  WifiOff,
  Refresh,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Warning,
  Error,
} from "@mui/icons-material";

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    server: "checking",
    hltv: "unknown",
    faceit: "unknown",
  });
  const [expanded, setExpanded] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const checkServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/health", {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        setStatus((prev) => ({ ...prev, server: "online" }));
      } else {
        setStatus((prev) => ({ ...prev, server: "error" }));
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, server: "offline" }));
    }
  };

  const checkHLTVStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/forze/matches", {
        method: "GET",
        timeout: 10000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error && data.source?.includes("Fallback")) {
          setStatus((prev) => ({ ...prev, hltv: "fallback" }));
        } else {
          setStatus((prev) => ({ ...prev, hltv: "online" }));
        }
      } else {
        setStatus((prev) => ({ ...prev, hltv: "error" }));
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, hltv: "offline" }));
    }
  };

  const checkFaceitStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/faceit/stats", {
        method: "GET",
        timeout: 10000,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error && data.source?.includes("Fallback")) {
          setStatus((prev) => ({ ...prev, faceit: "fallback" }));
        } else {
          setStatus((prev) => ({ ...prev, faceit: "online" }));
        }
      } else {
        setStatus((prev) => ({ ...prev, faceit: "error" }));
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, faceit: "offline" }));
    }
  };

  const checkAllStatuses = async () => {
    setLastCheck(new Date());
    await Promise.all([
      checkServerStatus(),
      checkHLTVStatus(),
      checkFaceitStatus(),
    ]);
  };

  useEffect(() => {
    checkAllStatuses();

    // Проверяем статус каждые 30 секунд
    const interval = setInterval(checkAllStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "success";
      case "fallback":
        return "warning";
      case "offline":
        return "error";
      case "error":
        return "error";
      case "checking":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "online":
        return <CheckCircle fontSize="small" />;
      case "fallback":
        return <Warning fontSize="small" />;
      case "offline":
        return <WifiOff fontSize="small" />;
      case "error":
        return <Error fontSize="small" />;
      case "checking":
        return <Refresh fontSize="small" />;
      default:
        return <Wifi fontSize="small" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online":
        return "Онлайн";
      case "fallback":
        return "Fallback";
      case "offline":
        return "Офлайн";
      case "error":
        return "Ошибка";
      case "checking":
        return "Проверка";
      default:
        return "Неизвестно";
    }
  };

  const getStatusTooltip = (service, status) => {
    const baseText = `${service}: ${getStatusText(status)}`;

    switch (status) {
      case "online":
        return `${baseText} - Данные загружаются в реальном времени`;
      case "fallback":
        return `${baseText} - Используются резервные данные`;
      case "offline":
        return `${baseText} - Сервис недоступен`;
      case "error":
        return `${baseText} - Произошла ошибка при загрузке`;
      case "checking":
        return `${baseText} - Проверяем подключение...`;
      default:
        return `${baseText}`;
    }
  };

  const overallStatus = status.server === "online" ? "online" : "offline";

  return (
    <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title="Статус подключения">
          <Chip
            icon={getStatusIcon(overallStatus)}
            label="Подключение"
            color={getStatusColor(overallStatus)}
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ cursor: "pointer" }}
          />
        </Tooltip>

        <IconButton
          size="small"
          onClick={checkAllStatuses}
          disabled={Object.values(status).includes("checking")}
          sx={{ ml: 1 }}
        >
          <Refresh fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 1,
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 3,
            minWidth: 200,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Статус сервисов:
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Tooltip title={getStatusTooltip("Сервер", status.server)}>
              <Chip
                icon={getStatusIcon(status.server)}
                label={`Сервер: ${getStatusText(status.server)}`}
                color={getStatusColor(status.server)}
                size="small"
                variant="outlined"
              />
            </Tooltip>

            <Tooltip title={getStatusTooltip("HLTV", status.hltv)}>
              <Chip
                icon={getStatusIcon(status.hltv)}
                label={`HLTV: ${getStatusText(status.hltv)}`}
                color={getStatusColor(status.hltv)}
                size="small"
                variant="outlined"
              />
            </Tooltip>

            <Tooltip title={getStatusTooltip("FACEIT", status.faceit)}>
              <Chip
                icon={getStatusIcon(status.faceit)}
                label={`FACEIT: ${getStatusText(status.faceit)}`}
                color={getStatusColor(status.faceit)}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          </Box>

          {lastCheck && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Последняя проверка: {lastCheck.toLocaleTimeString("ru-RU")}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ConnectionStatus;

