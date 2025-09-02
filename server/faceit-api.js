import fetch from 'node-fetch';

class FaceitAPI {
  constructor() {
    // Официальное FACEIT API v4
    this.baseUrl = 'https://open.faceit.com/data/v4';
    // Server-side API ключ
    this.apiKey = '8ac88b97-7f62-4d9a-aeac-59570464a944';
    // Client-side ключ для получения матчей
    this.clientSideKey = '678b7cae-c3af-4411-a287-bc128123dd31';
    // FORZE Reload team ID
    this.teamId = '8689f8ac-c01b-40f4-96c6-9e7627665b65';
  }

  async makeRequest(endpoint, useClientKey = false) {
    const key = useClientKey ? this.clientSideKey : this.apiKey;
    console.log(`🔑 Используем ${useClientKey ? 'client-side' : 'server-side'} ключ`);
    console.log(`🌐 URL: ${this.baseUrl}${endpoint}`);
    
    if (!key) {
      throw new Error('FACEIT API ключ не установлен');
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📡 Отправляем запрос к: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка API: ${response.status} ${response.statusText}`);
      console.error(`📄 Текст ошибки: ${errorText}`);
      
      throw new Error(`FACEIT API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  // Поиск команды по имени
  async searchTeam(teamName) {
    try {
      console.log(`🔍 Ищем команду: ${teamName}`);
      const data = await this.makeRequest(`/search/teams?nickname=${encodeURIComponent(teamName)}&game=cs2&offset=0&limit=10`);
      
      if (data.items && data.items.length > 0) {
        console.log(`✅ Найдено команд: ${data.items.length}`);
        return data.items;
      } else {
        console.log('❌ Команда не найдена');
        return [];
      }
    } catch (error) {
      console.error('❌ Ошибка поиска команды:', error.message);
      throw error;
    }
  }

  // Получение информации о команде
  async getTeamInfo() {
    try {
      console.log('🔍 Получаем информацию о команде FACEIT...');
      const data = await this.makeRequest(`/teams/${this.teamId}`);
      
      return {
        id: data.team_id,
        name: data.name,
        avatar: data.avatar,
        game: data.games?.cs2?.game_id || 'cs2',
        region: data.region,
        country: data.country,
        level: data.games?.cs2?.skill_level || 'Unknown',
        members: data.members,
        leader: data.leader
      };
    } catch (error) {
      console.error('❌ Ошибка получения информации о команде:', error.message);
      throw error;
    }
  }

  // Получение статистики команды
  async getTeamStats() {
    try {
      console.log('📊 Получаем статистику команды FACEIT...');
      const data = await this.makeRequest(`/teams/${this.teamId}/stats/cs2`);
      
      const lifetime = data.lifetime || {};
      
      return {
        totalMatches: parseInt(lifetime['Matches'] || 0),
        wins: parseInt(lifetime['Wins'] || 0),
        losses: parseInt(lifetime['Matches'] || 0) - parseInt(lifetime['Wins'] || 0),
        winRate: parseFloat(lifetime['Win Rate %'] || 0),
        averageKDRatio: parseFloat(lifetime['Team Average K/D Ratio'] || 0),
        currentStreak: lifetime['Current Win Streak'] || '0',
        maxWinStreak: parseInt(lifetime['Longest Win Streak'] || 0),
        maxLossStreak: parseInt(lifetime['Longest Win Streak'] || 0)
      };
    } catch (error) {
      console.error('❌ Ошибка получения статистики команды:', error.message);
      throw error;
    }
  }

  // Получение информации о игроке (включая ELO)
  async getPlayerInfo(playerId) {
    try {
      console.log(`👤 Получаем информацию о игроке ${playerId}...`);
      const data = await this.makeRequest(`/players/${playerId}`);
      
      // Получаем ELO рейтинг для CS2
      const cs2Game = data.games?.cs2;
      const faceitElo = cs2Game?.faceit_elo || 1000;
      
      return {
        nickname: data.nickname,
        country: data.country,
        faceitElo: faceitElo,
        skillLevel: cs2Game?.skill_level || 0
      };
    } catch (error) {
      console.error(`❌ Ошибка получения информации о игроке ${playerId}:`, error.message);
      return {
        nickname: "Unknown",
        country: "Unknown",
        faceitElo: 1000,
        skillLevel: 0
      };
    }
  }

  // Получение статистики игрока
  async getPlayerStats(playerId) {
    try {
      console.log(`👤 Получаем статистику игрока ${playerId}...`);
      const data = await this.makeRequest(`/players/${playerId}/stats/cs2`);
      
      const lifetime = data.lifetime || {};
      
      // Вычисляем skill level из segments (берем самый высокий уровень)
      let skillLevel = 0;
      if (data.segments && data.segments.length > 0) {
        const mapSegments = data.segments.filter(seg => seg.type === 'Map');
        if (mapSegments.length > 0) {
          const levels = mapSegments.map(seg => parseInt(seg.stats?.['Skill Level'] || 0)).filter(l => l > 0);
          if (levels.length > 0) {
            skillLevel = Math.max(...levels);
          }
        }
      }
      
      if (skillLevel === 0) {
        skillLevel = parseInt(lifetime['Skill Level'] || 0);
      }
      
      if (skillLevel === 0) {
        const winRate = parseFloat(lifetime['Win Rate %'] || 0);
        const avgKDRatio = parseFloat(lifetime['Average K/D Ratio'] || 0);
        const totalMatches = parseInt(lifetime['Matches'] || 0);
        
        if (totalMatches > 0) {
          const baseLevel = Math.floor((winRate / 10) + (avgKDRatio * 2));
          skillLevel = Math.max(1, Math.min(10, baseLevel));
        }
      }
      
      const winRate = parseFloat(lifetime['Win Rate %'] || 0);
      const avgKDRatio = parseFloat(lifetime['Average K/D Ratio'] || 0);
      const totalMatches = parseInt(lifetime['Matches'] || 0);
      
      let eloRating = 1000;
      if (totalMatches > 0) {
        const winRateBonus = (winRate - 50) * 10;
        const kdBonus = (avgKDRatio - 1.0) * 200;
        eloRating = Math.max(500, Math.min(2000, 1000 + winRateBonus + kdBonus));
      }
      
      const totalKills = parseInt(lifetime['Total Kills with extended stats'] || 0);
      const totalDeaths = avgKDRatio > 0 ? Math.round(totalKills / avgKDRatio) : 0;
      
      const playerInfo = await this.getPlayerInfo(playerId);
      
      return {
        skillLevel: skillLevel,
        eloRating: playerInfo.faceitElo,
        totalMatches: parseInt(lifetime['Matches'] || 0),
        wins: parseInt(lifetime['Wins'] || 0),
        losses: parseInt(lifetime['Matches'] || 0) - parseInt(lifetime['Wins'] || 0),
        winRate: parseFloat(lifetime['Win Rate %'] || 0),
        averageKDRatio: avgKDRatio,
        totalKills: totalKills,
        totalDeaths: totalDeaths,
        totalAssists: parseInt(lifetime['Total Assists'] || 0),
        averageKills: parseFloat(lifetime['Average Kills'] || 0),
        averageDeaths: parseFloat(lifetime['Average Deaths'] || 0),
        averageAssists: parseFloat(lifetime['Average Assists'] || 0),
        mvps: parseInt(lifetime['MVPs'] || 0),
        headshots: parseInt(lifetime['Headshots'] || 0),
        headshotPercentage: parseFloat(lifetime['Headshots %'] || 0)
      };
    } catch (error) {
      console.error(`❌ Ошибка получения статистики игрока ${playerId}:`, error.message);
      return {
        skillLevel: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        averageKDRatio: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        averageKills: 0,
        averageDeaths: 0,
        averageAssists: 0,
        mvps: 0,
        headshots: 0,
        headshotPercentage: 0
      };
    }
  }

  // Получение детальной информации о матче (включая все карты BO3)
  async getMatchDetails(matchId) {
    try {
      console.log(`🔍 Получаем детали матча: ${matchId}`);
      
      const data = await this.makeRequest(`/matches/${matchId}`);
      
      if (!data) {
        console.log(`⚠️ Не удалось получить детали матча ${matchId}`);
        return null;
      }
      
      const teams = data.teams || {};
      const ourTeam = Object.values(teams).find(team => team.faction_id === this.teamId);
      
      if (!ourTeam) {
        console.log(`⚠️ Наша команда не найдена в матче ${matchId}`);
        return null;
      }
      
      const ourFaction = Object.keys(teams).find(key => teams[key].faction_id === this.teamId);
      const oppFaction = ourFaction === 'faction1' ? 'faction2' : 'faction1';
      const opponent = teams[oppFaction]?.name || 'Unknown';
      
      const results = data.results || {};
      const score = results.score || {};
      
      const ourTotalScore = score[ourFaction] || 0;
      const oppTotalScore = score[oppFaction] || 0;
      
      const isWin = ourTotalScore > oppTotalScore;
      
      const mapResults = data.voting?.map_pick || [];
      
      console.log(`📊 Матч ${matchId}:`);
      console.log(`  Противник: ${opponent}`);
      console.log(`  Наш общий счет: ${ourTotalScore}`);
      console.log(`  Счет противника: ${oppTotalScore}`);
      console.log(`  Результат матча: ${isWin ? 'Победа' : 'Поражение'}`);
      console.log(`  Количество карт: ${mapResults.length}`);
      
      return {
        matchId: matchId,
        opponent: opponent,
        ourScore: ourTotalScore,
        oppScore: oppTotalScore,
        isWin: isWin,
        totalMaps: mapResults.length,
        competition: data.competition_name || 'FACEIT',
        date: data.started_at ? new Date(data.started_at * 1000).toISOString().split('T')[0] : 'Unknown',
        mapResults: mapResults
      };
      
    } catch (error) {
      console.error(`❌ Ошибка получения деталей матча ${matchId}:`, error.message);
      return null;
    }
  }

  // Получение матчей команды через историю игрока с улучшенной фильтрацией
  async getTeamMatches(offset = 0, limit = 100) {
    try {
      console.log(`🎮 Получаем матчи команды FACEIT через историю игрока (offset: ${offset}, limit: ${limit})...`);
      
      const teamInfo = await this.getTeamInfo();
      console.log(`👥 Найдено игроков в команде: ${teamInfo.members?.length || 0}`);
      
      if (!teamInfo.members || teamInfo.members.length === 0) {
        console.log('⚠️ Не удалось получить список игроков команды');
        return [];
      }
      
      const captain = teamInfo.members.find(member => member.user_id === teamInfo.leader) || teamInfo.members[0];
      console.log(`🎯 Получаем матчи капитана: ${captain.nickname} (${captain.user_id})`);
      
      const data = await this.makeRequest(`/players/${captain.user_id}/history?offset=${offset}&limit=${limit}`, true);
      console.log(`✅ Получено ${data.items?.length || 0} матчей из истории игрока`);
      
      // Вычисляем дату 3 месяца назад для фильтрации
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      console.log(`📅 Фильтруем матчи не старше: ${threeMonthsAgo.toISOString().split('T')[0]}`);
      
      // СТРОГАЯ фильтрация: проверяем что это именно командный матч FORZE Reload
      const teamMatches = (data.items || []).filter(match => {
        if (!match.teams) {
          console.log(`⚠️ Пропускаем матч ${match.match_id} - нет teams`);
          return false;
        }
        
        // Проверяем, есть ли наша команда в матче
        const ourTeam = Object.values(match.teams).find(team => team.team_id === this.teamId);
        if (!ourTeam) {
          console.log(`⚠️ Пропускаем матч ${match.match_id} - FORZE Reload не участвует`);
          return false;
        }
        
        // Проверяем что матч завершен
        if (match.finished === 0) {
          console.log(`⚠️ Пропускаем незавершенный матч ${match.match_id}`);
          return false;
        }
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: фильтрация по дате - исключаем старые матчи
        if (match.started_at) {
          const matchDate = new Date(match.started_at * 1000);
          if (matchDate < threeMonthsAgo) {
            console.log(`⚠️ Пропускаем старый матч ${match.match_id} от ${matchDate.toISOString().split('T')[0]} (старше 3 месяцев)`);
            return false;
          }
        }
        
        // Дополнительная проверка: убеждаемся что это командный матч, а не 5v5
        if (match.i1 === '5v5') {
          console.log(`⚠️ Пропускаем 5v5 матч ${match.match_id} - не командный`);
          return false;
        }
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: проверяем что игрок играл именно за FORZE Reload в этом матче
        // Если в матче есть наша команда, но игрок играл за другую - пропускаем
        if (match.teams && match.teams.faction1 && match.teams.faction2) {
          const faction1TeamId = match.teams.faction1.team_id;
          const faction2TeamId = match.teams.faction2.team_id;
          
          // Проверяем что FORZE Reload участвует в матче
          if (faction1TeamId !== this.teamId && faction2TeamId !== this.teamId) {
            console.log(`⚠️ Пропускаем матч ${match.match_id} - FORZE Reload не участвует (f1: ${faction1TeamId}, f2: ${faction2TeamId})`);
            return false;
          }
          
          // Проверяем что игрок играл именно за FORZE Reload
          const playerTeamId = match.team_id || match.teamId;
          if (playerTeamId && playerTeamId !== this.teamId) {
            console.log(`⚠️ Пропускаем матч ${match.match_id} - игрок играл за другую команду: ${playerTeamId}`);
            return false;
          }
        }
        
        // Проверяем что это не матч где игроки играли за другие команды
        // Если в матче есть наша команда, но это не командный матч - пропускаем
        if (match.i1 && match.i1 !== '5v5' && match.i1 !== 'Team') {
          console.log(`⚠️ Пропускаем матч ${match.match_id} - тип: ${match.i1}`);
          return false;
        }
        
        console.log(`✅ Включаем матч ${match.match_id} против ${ourTeam.nickname || 'Unknown'}`);
        return true;
      });
      
      console.log(`🔍 Отфильтровано ${teamMatches.length} командных матчей FORZE Reload из ${data.items?.length || 0}`);
      return teamMatches;
      
    } catch (error) {
      console.error('❌ Ошибка получения матчей команды:', error.message);
      return [];
    }
  }

  // Получение всех матчей команды с детальной информацией
  async getAllMatches() {
    try {
      console.log('🔄 Получаем все матчи команды FACEIT...');
      
      let allMatches = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let requestCount = 0;
      const maxRequests = 40;
      
      while (hasMore && requestCount < maxRequests) {
        console.log(`📥 Запрос ${requestCount + 1}/${maxRequests}: offset=${offset}, limit=${limit}`);
        
        const matches = await this.getTeamMatches(offset, limit);
        requestCount++;
        
        if (matches.length === 0) {
          hasMore = false;
          console.log('✅ Больше матчей команды нет');
        } else {
          allMatches = allMatches.concat(matches);
          offset += limit;
          
          console.log(`📊 Всего получено матчей команды: ${allMatches.length}`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`✅ Итого получено ${allMatches.length} матчей команды FORZE Reload`);
      
      // Теперь получаем детальную информацию для каждого матча
      console.log('🔍 Получаем детальную информацию для каждого матча...');
      const detailedMatches = [];
      
      for (let i = 0; i < allMatches.length; i++) {
        const match = allMatches[i];
        console.log(`📋 Обрабатываем матч ${i + 1}/${allMatches.length}: ${match.match_id}`);
        
        try {
          const matchDetails = await this.getMatchDetails(match.match_id);
          if (matchDetails) {
            detailedMatches.push(matchDetails);
          }
        } catch (error) {
          console.log(`⚠️ Ошибка получения деталей матча ${match.match_id}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Получены детали для ${detailedMatches.length} матчей`);
      return detailedMatches;
      
    } catch (error) {
      console.error('❌ Ошибка получения всех матчей:', error.message);
      throw error;
    }
  }

  // Форматирование матчей для фронтенда
  formatMatchesForFrontend(matches) {
    return matches.map(match => {
      let date, dateISO;
      
      try {
        // Проверяем, что дата валидная
        if (match.date && match.date !== 'Unknown') {
          date = new Date(match.date);
          if (isNaN(date.getTime())) {
            // Если дата невалидная, используем текущую
            date = new Date();
          }
        } else {
          // Если даты нет, используем текущую
          date = new Date();
        }
        
        dateISO = date.toISOString();
      } catch (error) {
        console.log(`⚠️ Ошибка парсинга даты для матча ${match.matchId}: ${match.date}`);
        date = new Date();
        dateISO = date.toISOString();
      }
      
      return {
        id: match.matchId,
        date: match.date || date.toISOString().split('T')[0],
        dateISO: dateISO,
        event: match.competition || 'FACEIT',
        opponent: match.opponent || 'Unknown',
        map: `Best of ${match.totalMaps || 1}`,
        our: match.ourScore || 0,
        opp: match.oppScore || 0,
        result: `${match.ourScore || 0}:${match.oppScore || 0}`,
        wl: match.isWin ? 'W' : 'L',
        source: 'FACEIT',
        eloChange: '0',
        maps: match.mapResults || [],
        bestOf: match.totalMaps || 1,
        totalMaps: match.totalMaps || 1
      };
    });
  }

  // Получение полных данных команды
  async getTeamData() {
    try {
      console.log('🎯 Получаем полные данные команды FACEIT...');
      
      const searchResults = await this.searchTeam('FORZE Reload');
      if (searchResults.length > 0) {
        this.teamId = searchResults[0].team_id;
        console.log(`✅ Обновлен team ID: ${this.teamId}`);
      }
      
      const [teamInfo, teamStats, matches] = await Promise.all([
        this.getTeamInfo(),
        this.getTeamStats(),
        this.getAllMatches()
      ]);
      
      const formattedMatches = this.formatMatchesForFrontend(matches);
      
      return {
        teamInfo,
        teamStats,
        matches: formattedMatches,
        totalMatches: formattedMatches.length,
        wins: formattedMatches.filter(m => m.wl === 'W').length,
        losses: formattedMatches.filter(m => m.wl === 'L').length,
        winRate: formattedMatches.length > 0 ? Math.round((formattedMatches.filter(m => m.wl === 'W').length / formattedMatches.length) * 100) : 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Ошибка получения данных команды:', error.message);
      throw error;
    }
  }

  // Fallback метод для случая отсутствия API ключа
  async getTeamStatsFallback() {
    console.log('⚠️ Используем fallback данные FACEIT (API ключ не настроен)');
    
    const fallbackData = {
      teamInfo: {
        name: 'FORZE Reload',
        level: 'Level 8',
        elo: 1250
      },
      teamStats: {
        'Total Matches': '327',
        'Wins': '94',
        'Losses': '233',
        'Win Rate': '28.7%',
        'Current Streak': '+1',
        'Max Win Streak': '5',
        'Max Loss Streak': '8'
      },
      matches: [],
      totalMatches: 327,
      wins: 94,
      losses: 233,
      winRate: 28.7,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📊 Fallback данные:', JSON.stringify(fallbackData, null, 2));
    return fallbackData;
  }
}

export default FaceitAPI;
