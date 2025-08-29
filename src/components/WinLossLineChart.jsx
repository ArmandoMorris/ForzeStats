// src/components/WinLossLineChart.jsx
import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const WinLossLineChart = ({ matches = [] }) => {
  console.log('WinLossLineChart render - matches:', matches);
  console.log('Тип matches:', typeof matches);
  console.log('Длина matches:', matches ? matches.length : 'undefined');
  console.log('Первый элемент:', matches && matches.length > 0 ? matches[0] : 'нет данных');

  // Обработка ошибок
  if (!matches || !Array.isArray(matches)) {
    return (
      <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Ошибка: неверный формат данных</div>
      </div>
    );
  }
  
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('all');

  // Сортируем матчи по дате (от старых к новым)
  const sortedMatches = useMemo(() => {
    try {
      console.log('Сортировка матчей, количество:', matches.length);
      if (!matches || matches.length === 0) {
        console.log('Нет матчей для сортировки');
        return [];
      }
      
      return [...matches].sort((a, b) => {
        try {
          if (!a.date || !b.date) {
            console.warn('Отсутствует поле date в объекте матча:', a, b);
            return 0;
          }
          
          const [dayA, monthA, yearA] = a.date.split('.').map(Number);
          const [dayB, monthB, yearB] = b.date.split('.').map(Number);
          
          if (isNaN(dayA) || isNaN(monthA) || isNaN(yearA) || 
              isNaN(dayB) || isNaN(monthB) || isNaN(yearB)) {
            console.warn('Некорректная дата:', a.date, b.date);
            return 0;
          }
          
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA - dateB;
        } catch (error) {
          console.error('Ошибка при сортировке матчей:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Ошибка при сортировке матчей:', error);
      return matches || [];
    }
  }, [matches]);

  // Проверяем, есть ли данные для отображения
  if (!sortedMatches || sortedMatches.length === 0) {
    return (
      <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Нет данных для отображения графика</div>
      </div>
    );
  }

  // Функция для расчета статистики
  const calculateStats = (matches) => {
    if (!matches || matches.length === 0) return null;
    
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
  };

  // Подготавливаем данные для графика (только первые 20 матчей для упрощения)
  const chartData = sortedMatches.slice(0, 20).map((match, index) => {
    try {
      return {
        date: match.date || 'Неизвестная дата',
        result: match.wl === 'W' ? 1 : 0,
        event: match.event || 'Неизвестный турнир',
        opponent: match.opponent || 'Неизвестный противник',
        resultScore: match.result || 'N/A',
        wl: match.wl || 'N/A'
      };
    } catch (error) {
      console.error('Ошибка при подготовке данных матча:', error, match);
      return {
        date: 'Ошибка',
        result: 0,
        event: 'Ошибка',
        opponent: 'Ошибка',
        resultScore: 'N/A',
        wl: 'N/A'
      };
    }
  });

  // Рассчитываем статистику
  const stats = calculateStats(sortedMatches);

  // Простой tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '12px', 
          border: '1px solid #ccc', 
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.date}</p>
          <p style={{ margin: '4px 0' }}>Турнир: {data.event}</p>
          <p style={{ margin: '4px 0' }}>Противник: {data.opponent}</p>
          <p style={{ margin: '4px 0' }}>Счёт: {data.resultScore}</p>
          <p style={{ margin: '4px 0', color: data.wl === 'W' ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
            Результат: {data.wl === 'W' ? 'Победа' : 'Поражение'}
          </p>
        </div>
      );
    }
    return null;
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
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Тип графика:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="line">Линейный график</option>
            <option value="area">Областной график</option>
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

      {/* Графики */}
      <div style={{ height: '500px', marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' && (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={[0, 1]}
                tickCount={3}
                tickFormatter={(value) => value === 1 ? 'W' : (value === 0 ? 'L' : value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="result"
                name="Результаты матчей"
                stroke="#2196f3"
                strokeWidth={2}
                dot={{ r: 4, fill: '#2196f3' }}
                activeDot={{ r: 6, fill: '#fff', stroke: '#2196f3', strokeWidth: 2 }}
              />
            </LineChart>
          )}

          {chartType === 'area' && (
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={[0, 1]}
                tickCount={3}
                tickFormatter={(value) => value === 1 ? 'W' : (value === 0 ? 'L' : value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="result"
                name="Результаты матчей"
                stroke="#2196f3"
                fill="#2196f3"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          )}

          {chartType === 'bar' && (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={[0, 1]}
                tickCount={3}
                tickFormatter={(value) => value === 1 ? 'W' : (value === 0 ? 'L' : value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="result"
                name="Результаты матчей"
                fill="#2196f3"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WinLossLineChart;