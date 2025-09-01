import React, { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import {
  Timeline,
  SportsEsports,
  Analytics,
  Person,
} from "@mui/icons-material";

const GooeyNav = ({ activeTab, onTabChange }) => {
  const [isHovered, setIsHovered] = useState(null);

  const tabs = [
    {
      id: "overview",
      label: "Обзор",
      icon: <Analytics />,
      color: "#4caf50",
    },
    {
      id: "hltv",
      label: "HLTV",
      icon: <Timeline />,
      color: "#2196f3",
    },
    {
      id: "faceit",
      label: "FACEIT",
      icon: <SportsEsports />,
      color: "#ff5722",
    },
    {
      id: "players",
      label: "Игроки",
      icon: <Person />,
      color: "#9c27b0",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mb: 4,
        position: "relative",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          display: "flex",
          borderRadius: "50px",
          padding: "8px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
            borderRadius: "50px",
            zIndex: 1,
          },
        }}
      >
        {tabs.map((tab) => (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => setIsHovered(tab.id)}
            onMouseLeave={() => setIsHovered(null)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: "12px 16px",
              borderRadius: "40px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              zIndex: 2,
              background:
                activeTab === tab.id
                  ? `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}dd 100%)`
                  : "transparent",
              color: activeTab === tab.id ? "white" : "#666",
              transform:
                activeTab === tab.id
                  ? "scale(1.05)"
                  : isHovered === tab.id
                  ? "scale(1.02)"
                  : "scale(1)",
              boxShadow:
                activeTab === tab.id ? `0 8px 25px ${tab.color}40` : "none",
              "&:hover": {
                background:
                  activeTab === tab.id
                    ? `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}dd 100%)`
                    : "rgba(255,255,255,0.1)",
                transform: "scale(1.02)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                transition: "all 0.3s ease",
              }}
            >
              {tab.icon}
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: "14px",
                letterSpacing: "0.5px",
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default GooeyNav;
