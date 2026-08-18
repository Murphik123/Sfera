const { qdrant } = require('./qdrant');

async function testVectorOperations() {
  const collectionName = 'sfera_vectors';

  try {
    const dummyVector = Array.from({ length: 1536 }, () => Math.random());

    // 1. Записываем вектор и ждем подтверждения индексации
    await qdrant.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: 1,
          vector: dummyVector,
          payload: { title: 'Тестовая запись Sfera' },
        },
      ],
    });
    console.log('✅ Тестовый вектор успешно записан!');

    // 2. Выполняем поиск с явным запросом payload
    const searchResult = await qdrant.query(collectionName, {
      query: dummyVector,
      limit: 1,
      with_payload: true,
    });

    console.log('✅ Тестовый поиск выполнен!');
    console.dir(searchResult, { depth: null });
  } catch (error) {
    console.error('❌ Ошибка работы с векторами:', error.message);
  }
}

testVectorOperations();