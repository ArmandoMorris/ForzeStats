import FaceitAPI from './faceit-api.js';

async function testSimple() {
  console.log('🧪 Простой тест FACEIT API...');
  
  try {
    const faceitAPI = new FaceitAPI();
    
    console.log('🔍 Тестируем поиск команды...');
    const searchResults = await faceitAPI.searchTeam('FORZE Reload');
    console.log('Результаты поиска:', searchResults.length, 'команд');
    
    if (searchResults.length > 0) {
      console.log('✅ Команда найдена:', searchResults[0].name);
      
      console.log('📋 Тестируем информацию о команде...');
      const teamInfo = await faceitAPI.getTeamInfo();
      console.log('✅ Информация о команде:', teamInfo.name);
      
      console.log('📊 Тестируем статистику команды...');
      const teamStats = await faceitAPI.getTeamStats();
      console.log('✅ Статистика команды:', teamStats.totalMatches, 'матчей');
      
      console.log('🎯 Тестируем полные данные...');
      const teamData = await faceitAPI.getTeamData();
      console.log('✅ Полные данные получены');
      
    } else {
      console.log('❌ Команда не найдена');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSimple();
