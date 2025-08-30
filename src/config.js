// Конфигурация API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  matches: `${API_BASE_URL}/api/forze/matches`,
  roster: `${API_BASE_URL}/api/forze/roster`,
  upcoming: `${API_BASE_URL}/api/forze/upcoming`,
  faceitStats: `${API_BASE_URL}/api/faceit/stats`
};
