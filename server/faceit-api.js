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
        totalMatches: parseInt(lifetime['Matches'] || 0), // Используем правильное поле
        wins: parseInt(lifetime['Wins'] || 0),
        losses: parseInt(lifetime['Matches'] || 0) - parseInt(lifetime['Wins'] || 0), // Используем правильное поле
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

  // Получение матчей команды через историю игрока с фильтрацией
  async getTeamMatches(offset = 0, limit = 100) {
    try {
      console.log(`🎮 Получаем матчи команды FACEIT (offset: ${offset}, limit: ${limit})...`);
      
      // Получаем информацию о команде
      const teamInfo = await this.getTeamInfo();
      console.log(`👥 Найдено игроков в команде: ${teamInfo.members?.length || 0}`);
      
      if (!teamInfo.members || teamInfo.members.length === 0) {
        console.log('⚠️ Не удалось получить список игроков команды');
        return [];
      }
      
      // Получаем матчи капитана команды
      const captain = teamInfo.members.find(member => member.user_id === teamInfo.leader) || teamInfo.members[0];
      console.log(`🎯 Получаем матчи капитана: ${captain.nickname} (${captain.user_id})`);
      
      const data = await this.makeRequest(`/players/${captain.user_id}/history?offset=${offset}&limit=${limit}`, true);
      console.log(`✅ Получено ${data.items?.length || 0} матчей из истории игрока`);
      
      // Фильтруем только матчи команды FORZE Reload
      const teamMatches = (data.items || []).filter(match => {
        if (!match.teams) return false;
        
        // Проверяем, есть ли наша команда в матче
        const ourTeam = Object.values(match.teams).find(team => team.team_id === this.teamId);
        return ourTeam !== undefined;
      });
      
      console.log(`🔍 Отфильтровано ${teamMatches.length} матчей команды FORZE Reload из ${data.items?.length || 0}`);
      return teamMatches;
    } catch (error) {
      console.error('❌ Ошибка получения матчей команды:', error.message);
      return [];
    }
  }

  // Получение всех матчей команды
  async getAllMatches() {
    try {
      console.log('🔄 Получаем все матчи команды FACEIT...');
      
      let allMatches = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let requestCount = 0;
      const maxRequests = 40; // Увеличиваем лимит запросов до 40 (4000 матчей)
      
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
          
          // Небольшая задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`✅ Итого получено ${allMatches.length} матчей команды FORZE Reload`);
      return allMatches;
    } catch (error) {
      console.error('❌ Ошибка получения всех матчей:', error.message);
      throw error;
    }
  }

  // Группировка карт в полные матчи
  groupMapsIntoMatches(matches) {
    console.log('🔍 Группируем карты в полные матчи...');
    
    // Группируем по competition_id и дате
    const matchGroups = {};
    
    matches.forEach(match => {
      const competitionId = match.competition_id || match.match_id;
      const date = new Date(match.started_at * 1000 || match.date).toISOString().split('T')[0];
      const opponent = this.getOpponentFromMatch(match);
      const event = match.competition_name || 'FACEIT';
      
      const key = `${competitionId}_${date}_${opponent}_${event}`;
      
      if (!matchGroups[key]) {
        matchGroups[key] = {
          competitionId,
          date,
          opponent,
          event,
          maps: [],
          ourWins: 0,
          oppWins: 0,
          totalMaps: 0
        };
      }
      
      // Добавляем карту в группу
      const isWin = this.isWinFromMatch(match);
      matchGroups[key].maps.push({
        map: this.getMapFromMatch(match),
        ourScore: this.getOurScoreFromMatch(match),
        oppScore: this.getOppScoreFromMatch(match),
        isWin
      });
      
      if (isWin) {
        matchGroups[key].ourWins++;
      } else {
        matchGroups[key].oppWins++;
      }
      matchGroups[key].totalMaps++;
    });
    
    // Преобразуем группы в полные матчи
    const fullMatches = Object.values(matchGroups).map(group => {
      const isWin = group.ourWins > group.oppWins;
      const mapsPlayed = group.maps.length;
      const bestOf = this.determineBestOf(mapsPlayed);
      
      return {
        id: group.competitionId,
        date: group.date,
        dateISO: new Date(group.date).toISOString(),
        event: group.event,
        opponent: group.opponent,
        our: group.ourWins,
        opp: group.oppWins,
        result: `${group.ourWins}:${group.oppWins}`,
        wl: isWin ? 'W' : 'L',
        source: 'FACEIT',
        maps: group.maps,
        bestOf: bestOf,
        totalMaps: group.totalMaps,
        eloChange: '0'
      };
    });
    
    console.log(`✅ Сгруппировано ${matches.length} карт в ${fullMatches.length} полных матчей`);
    return fullMatches;
  }
  
  // Вспомогательные методы для извлечения данных из матча
  getOpponentFromMatch(match) {
    if (match.results && match.teams) {
      const teams = match.teams;
      const otherTeam = Object.values(teams).find(team => team.team_id !== this.teamId);
      return otherTeam?.nickname || 'Unknown';
    } else if (match.i19) {
      return match.i19;
    }
    return 'Unknown';
  }
  
  isWinFromMatch(match) {
    if (match.results && match.teams) {
      const results = match.results;
      const teams = match.teams;
      const ourFaction = Object.keys(teams).find(key => teams[key].team_id === this.teamId);
      return results.winner === ourFaction;
    } else if (match.i18 !== undefined) {
      return match.i18 === '1';
    }
    return false;
  }
  
  getMapFromMatch(match) {
    // Пока карта недоступна в API
    return 'Unknown';
  }
  
  getOurScoreFromMatch(match) {
    if (match.results && match.teams) {
      const results = match.results;
      const teams = match.teams;
      const ourFaction = Object.keys(teams).find(key => teams[key].team_id === this.teamId);
      const score = results.score;
      return score ? (score[ourFaction] || 0) : 0;
    } else if (match.i20) {
      return parseInt(match.i20) || 0;
    }
    return 0;
  }
  
  getOppScoreFromMatch(match) {
    if (match.results && match.teams) {
      const results = match.results;
      const teams = match.teams;
      const ourFaction = Object.keys(teams).find(key => teams[key].team_id === this.teamId);
      const score = results.score;
      const oppFaction = ourFaction === 'faction1' ? 'faction2' : 'faction1';
      return score ? (score[oppFaction] || 0) : 0;
    } else if (match.i21) {
      return parseInt(match.i21) || 0;
    }
    return 0;
  }
  
  determineBestOf(mapsPlayed) {
    if (mapsPlayed <= 1) return 1;
    if (mapsPlayed <= 3) return 3;
    if (mapsPlayed <= 5) return 5;
    return mapsPlayed;
  }

  // Форматирование матчей для фронтенда (обновленная версия)
  formatMatchesForFrontend(matches) {
    // Сначала группируем карты в полные матчи
    const fullMatches = this.groupMapsIntoMatches(matches);
    
    return fullMatches.map(match => {
      const date = new Date(match.dateISO);
      
      return {
        id: match.id,
        date: match.date,
        dateISO: match.dateISO,
        event: match.event,
        opponent: match.opponent,
        map: `Best of ${match.bestOf}`, // Показываем формат матча
        our: match.our,
        opp: match.opp,
        result: match.result,
        wl: match.wl,
        source: 'FACEIT',
        eloChange: match.eloChange,
        maps: match.maps, // Сохраняем детали карт
        bestOf: match.bestOf,
        totalMaps: match.totalMaps
      };
    });
  }

  // Получение полных данных команды
  async getTeamData() {
    try {
      console.log('🎯 Получаем полные данные команды FACEIT...');
      
      // Сначала попробуем найти правильный team ID
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
