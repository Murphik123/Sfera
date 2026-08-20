const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const util = require('util');

const qdrant = require('./qdrant');
const { getEmbedding } = require('./embeddingService');

async function testVector() {
  try {
    const client = qdrant.client || qdrant.qdrantClient;
    const upsertFn = qdrant.upsertVector;

    console.log('🔄 Генерация вектора через Gemini...');
    const vector = await getEmbedding('Тестовый запрос для Sfera');

    console.log('🔄 Сохранение в Qdrant...');

    if (typeof upsertFn === 'function') {
      await upsertFn('sfera_vectors', {
        id: 1,
        vector: vector,
        payload: { text: 'Тестовый запрос для Sfera', category: 'test' }
      });
    } else {
      await client.upsert('sfera_vectors', {
        points: [
          {
            id: 1,
            vector: vector,
            payload: { text: 'Тестовый запрос для Sfera', category: 'test' }
          }
        ]
      });
    }

    console.log('✅ Вектор успешно сгенерирован и сохранен в Qdrant!');
  } catch (error) {
    console.error('❌ Основная ошибка:', error.message);

    // Вывод точной причины сетевого сбоя
    if (error.cause) {
      console.error('🔍 Детали сетевой ошибки (error.cause):', error.cause);
    }

    // Полный разбор объекта ошибки
    console.error('\n📋 Полный дамп ошибки:');
    console.dir(error, { depth: null, colors: true });
  }
}

testVector();
