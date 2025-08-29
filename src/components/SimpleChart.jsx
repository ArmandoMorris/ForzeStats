import React, { useState, useMemo } from 'react';

const SimpleChart = ({ matches = [] }) => {
  console.log('SimpleChart render - matches:', matches);

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return (
      <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Нет данных для отображения графика</div>
      </div>
    );
  }

  const [chartType, setChartType] = useState('line');

  // Сортируем матчи по дате
  const sortedMatches = useMemo(() => {
    try {
      return [...matches].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const [dayA, monthA, yearA] = a.date.split('.').map(Number);
        const [dayB, monthB, yearB] = b.date.split('.').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
      });
    } catch (error) {
      console.error('Ошибка при сортировке:', error);
      return matches;
    }
  }, [matches]);

  // Берем только последние 20 матчей
  const chartData = sortedMatches.slice(-20);

  // Рассчитываем статистику
  const stats = useMemo(() => {
    const totalMatches = matches.length;
    const wins = matches.filter(match => match.wl === 'W').length;
    const losses = totalMatches - wins;
    const winRate = ((wins / totalMatches) * 100).toFixed(1);
    
    let maxWinStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    matches.forEach(match => {
      if (match.wl === 'W') {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
      }
    });
    
    return {
      totalMatches,
      wins,
      losses,
      winRate,
      maxWinStreak,
      currentStreak: currentWinStreak > 0 ? currentWinStreak : -currentLossStreak
    };
  }, [matches]);

  const renderLineChart = () => {
    const chartHeight = 300;
    const chartWidth = 800;
    const pointRadius = 6;
    const strokeWidth = 2;

    return (
      <div style={{ overflow: 'auto', marginTop: '20px' }}>
        <svg width={chartWidth} height={chartHeight} style={{ border: '1px solid #ccc' }}>
          {/* Сетка */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Линия графика */}
          <polyline
            fill="none"
            stroke="#2196f3"
            strokeWidth={strokeWidth}
            points={chartData.map((match, index) => {
              const x = (index / (chartData.length - 1)) * (chartWidth - 100) + 50;
              const y = chartHeight - 50 - (match.wl === 'W' ? chartHeight - 100 : 0);
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Точки */}
          {chartData.map((match, index) => {
            const x = (index / (chartData.length - 1)) * (chartWidth - 100) + 50;
            const y = chartHeight - 50 - (match.wl === 'W' ? chartHeight - 100 : 0);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={pointRadius}
                fill={match.wl === 'W' ? '#4caf50' : '#f44336'}
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                title={`${match.date}: ${match.wl === 'W' ? 'Победа' : 'Поражение'} vs ${match.opponent}`}
              />
            );
          })}
          
          {/* Подписи осей */}
          <text x="20" y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90, 20, ${chartHeight / 2})`}>
            Результат
          </text>
          <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle">
            Время
          </text>
          
          {/* Подписи значений Y */}
          <text x="30" y="30" fontSize="12">W</text>
          <text x="30" y={chartHeight - 30} fontSize="12">L</text>
        </svg>
      </div>
    );
  };

  const renderBarChart = () => {
    const chartHeight = 300;
    const chartWidth = 800;
    const barWidth = Math.max(10, (chartWidth - 100) / chartData.length - 5);

    return (
      <div style={{ overflow: 'auto', marginTop: '20px' }}>
        <svg width={chartWidth} height={chartHeight} style={{ border: '1px solid #ccc' }}>
          {/* Сетка */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Столбцы */}
          {chartData.map((match, index) => {
            const x = (index / (chartData.length - 1)) * (chartWidth - 100) + 50;
            const barHeight = match.wl === 'W' ? chartHeight - 100 : 20;
            const y = chartHeight - 50 - barHeight;
            
            return (
              <rect
                key={index}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={match.wl === 'W' ? '#4caf50' : '#f44336'}
                stroke="#fff"
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                title={`${match.date}: ${match.wl === 'W' ? 'Победа' : 'Поражение'} vs ${match.opponent}`}
              />
            );
          })}
          
          {/* Подписи осей */}
          <text x="20" y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90, 20, ${chartHeight / 2})`}>
            Результат
          </text>
          <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle">
            Время
          </text>
          
          {/* Подписи значений Y */}
          <text x="30" y="30" fontSize="12">W</text>
          <text x="30" y={chartHeight - 30} fontSize="12">L</text>
        </svg>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
        Статистика команды FORZE Reload
      </h2>
      
      {/* Элементы управления */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginBottom: '30px'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Тип графика:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="line">Линейный график</option>
            <option value="bar">Столбчатая диаграмма</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Всего матчей</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#212529' }}>{stats.totalMatches}</p>
          </div>
          <div style={{ 
            background: '#d4edda', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #c3e6cb'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>Победы</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#155724' }}>{stats.wins}</p>
          </div>
          <div style={{ 
            background: '#f8d7da', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #f5c6cb'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>Поражения</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#721c24' }}>{stats.losses}</p>
          </div>
          <div style={{ 
            background: '#d1ecf1', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #bee5eb'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Процент побед</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0c5460' }}>{stats.winRate}%</p>
          </div>
          <div style={{ 
            background: '#fff3cd', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #ffeaa7'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Макс. серия побед</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#856404' }}>{stats.maxWinStreak}</p>
          </div>
          <div style={{ 
            background: '#e2e3e5', 
            padding: '15px', 
            borderRadius: '8px', 
            textAlign: 'center',
            border: '1px solid #d6d8db'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#383d41' }}>Текущая серия</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#383d41' }}>
              {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
            </p>
          </div>
        </div>
      )}

      {/* График */}
      <div style={{ textAlign: 'center' }}>
        {chartType === 'line' ? renderLineChart() : renderBarChart()}
      </div>
      
      {/* Легенда */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginTop: '20px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4caf50', borderRadius: '50%' }}></div>
          <span>Победы</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#f44336', borderRadius: '50%' }}></div>
          <span>Поражения</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleChart;
