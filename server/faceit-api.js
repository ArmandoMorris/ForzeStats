import fetch from 'node-fetch';

class FaceitAPI {
  constructor() {
    this.baseUrl = 'https://www.faceit.com/api/stats/v1';
    this.teamId = '8689f8ac-c01b-40f4-96c6-9e7627665b65';
  }

  async getAllMatches() {
    try {
      console.log('Fetching all FACEIT matches...');
      
      let allMatches = [];
      let page = 0; // Начинаем с 0 страницы
      let hasMore = true;
      let consecutiveEmptyPages = 0;
      const maxEmptyPages = 5; // Увеличиваем лимит пустых страниц
      let totalPagesChecked = 0;
      const maxPagesToCheck = 50; // Максимум 50 страниц для проверки
      
      while (hasMore && consecutiveEmptyPages < maxEmptyPages && totalPagesChecked < maxPagesToCheck) {
        console.log(`Fetching page ${page}...`);
        
        const url = `${this.baseUrl}/stats/time/teams/${this.teamId}/games/cs2?page=${page}&size=100`;
        console.log(`Requesting URL: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Page ${page}: found ${data.length} matches`);
        
        if (data.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Empty page ${page}, consecutive empty pages: ${consecutiveEmptyPages}`);
        } else {
          consecutiveEmptyPages = 0; // Сбрасываем счетчик пустых страниц
          allMatches = allMatches.concat(data);
          console.log(`Total matches so far: ${allMatches.length}`);
          
          // Если получили ровно 100 матчей, продолжаем загружать
          if (data.length === 100) {
            console.log(`Page ${page} has exactly 100 matches, continuing...`);
          }
        }
        
        page++;
        totalPagesChecked++;
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Дополнительная проверка: если получили меньше 100 матчей, это может быть последняя страница
        if (data.length > 0 && data.length < 100) {
          console.log(`Page ${page-1} has less than 100 matches (${data.length}), likely the last page`);
          // Но продолжаем еще несколько страниц на всякий случай
          if (consecutiveEmptyPages >= 2) {
            hasMore = false;
          }
        }
      }
      
      console.log(`Total matches fetched: ${allMatches.length}`);
      console.log(`Stopped after ${totalPagesChecked} pages checked`);
      console.log(`Last page checked: ${page-1}`);
      
      // Проверяем, есть ли дубликаты
      const uniqueMatches = this.removeDuplicates(allMatches);
      console.log(`After removing duplicates: ${uniqueMatches.length} matches`);
      
      return uniqueMatches;
      
    } catch (error) {
      console.error('Error fetching FACEIT matches:', error);
      throw error;
    }
  }

  removeDuplicates(matches) {
    const seen = new Set();
    return matches.filter(match => {
      const key = match._id?.matchId || match.matchId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async getTeamStats() {
    try {
      const matches = await this.getAllMatches();
      
      // Анализируем матчи для получения статистики
      const stats = this.analyzeMatches(matches);
      
      // Получаем последние матчи
      const recentMatches = this.formatRecentMatches(matches.slice(0, 10));
      
      return {
        teamInfo: {
          name: 'FORZE Reload',
          level: this.calculateLevel(stats.winRate),
          elo: this.calculateElo(stats.winRate, stats.totalMatches)
        },
        teamStats: {
          'Total Matches': stats.totalMatches.toString(),
          'Wins': stats.wins.toString(),
          'Losses': stats.losses.toString(),
          'Win Rate': `${stats.winRate.toFixed(1)}%`,
          'Current Streak': stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak.toString(),
          'Max Win Streak': stats.maxWinStreak.toString(),
          'Max Loss Streak': stats.maxLossStreak.toString()
        },
        recentMatches,
        scrapedAt: new Date().toISOString(),
        totalMatchesFetched: matches.length
      };
      
    } catch (error) {
      console.error('Error getting team stats:', error);
      throw error;
    }
  }

  analyzeMatches(matches) {
    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    // Сортируем матчи по дате (от новых к старым)
    const sortedMatches = matches.sort((a, b) => b.date - a.date);
    
    sortedMatches.forEach(match => {
      // Определяем результат матча
      const isWin = match.i17 === '1'; // i17 = результат (1 = победа, 0 = поражение)
      
      if (isWin) {
        wins++;
        if (currentStreak >= 0) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        
        currentWinStreak++;
        currentLossStreak = 0;
        
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else {
        losses++;
        if (currentStreak <= 0) {
          currentStreak--;
        } else {
          currentStreak = -1;
        }
        
        currentLossStreak++;
        currentWinStreak = 0;
        
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      }
    });
    
    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    
    return {
      totalMatches,
      wins,
      losses,
      winRate,
      currentStreak,
      maxWinStreak,
      maxLossStreak
    };
  }

  formatRecentMatches(matches) {
    return matches.map(match => {
      const isWin = match.i17 === '1';
      const date = new Date(match.date);
      const score = match.i18 || 'N/A'; // i18 = счет
      const map = match.i1 || 'N/A'; // i1 = карта
      
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD формат
        result: isWin ? 'W' : 'L',
        score: score,
        map: map,
        eloChange: isWin ? '+20' : '-18' // Примерное изменение ELO
      };
    });
  }

  calculateLevel(winRate) {
    if (winRate >= 80) return 'Level 10';
    if (winRate >= 75) return 'Level 9';
    if (winRate >= 70) return 'Level 8';
    if (winRate >= 65) return 'Level 7';
    if (winRate >= 60) return 'Level 6';
    if (winRate >= 55) return 'Level 5';
    if (winRate >= 50) return 'Level 4';
    if (winRate >= 45) return 'Level 3';
    if (winRate >= 40) return 'Level 2';
    return 'Level 1';
  }

  calculateElo(winRate, totalMatches) {
    // Базовая формула для расчета ELO
    const baseElo = 1000;
    const winRateBonus = (winRate - 50) * 10;
    const matchesBonus = Math.min(totalMatches * 2, 500);
    
    return Math.max(100, Math.round(baseElo + winRateBonus + matchesBonus));
  }
}

export default FaceitAPI;
