<<<<<<< HEAD
=======
// src/services/qdrant.service.js
>>>>>>> d969d102572f3321a56f4fced5f8b7c6b9cb6b70
const { QdrantClient } = require('@qdrant/js-client-rest');

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

<<<<<<< HEAD
=======
// Клиент создается только при наличии URL — платформа должна запускаться и без Qdrant
>>>>>>> d969d102572f3321a56f4fced5f8b7c6b9cb6b70
const qdrantClient = QDRANT_URL
  ? new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY })
  : null;

<<<<<<< HEAD
async function checkQdrantConnection() {
  if (!qdrantClient) {
    console.warn('⚠️ Qdrant: QDRANT_URL не задана');
    return false;
  }
  try {
    const collections = await qdrantClient.getCollections();
    console.log(`✅ Qdrant подключен: ${QDRANT_URL} (коллекций: ${collections.collections.length})`);
=======
const isQdrantConfigured = () => Boolean(QDRANT_URL);

// Логирует состояние кластера при старте сервера. Никогда не бросает исключение,
// чтобы недоступный Qdrant не мешал запуску платформы.
const checkQdrantConnection = async () => {
  if (!qdrantClient) {
    console.warn('⚠️  Qdrant: переменная QDRANT_URL не задана, векторный поиск отключен');
    return false;
  }

  if (!QDRANT_API_KEY) {
    console.warn('⚠️  Qdrant: QDRANT_API_KEY не задан, подключение к облачному кластеру может быть отклонено');
  }

  try {
    const { collections } = await qdrantClient.getCollections();
    const names = collections.map((collection) => collection.name);

    console.log(`✅ Qdrant подключен: ${QDRANT_URL} (коллекций: ${names.length})`);
    if (names.length) {
      console.log(`   Коллекции: ${names.join(', ')}`);
    }
>>>>>>> d969d102572f3321a56f4fced5f8b7c6b9cb6b70
    return true;
  } catch (error) {
    console.error(`❌ Qdrant недоступен (${QDRANT_URL}): ${error.message}`);
    return false;
  }
<<<<<<< HEAD
}

// Добавление или обновление вектора
async function upsertVector(collectionName, { id, vector, payload }) {
  if (!qdrantClient) return null;
  return await qdrantClient.upsert(collectionName, {
    points: [{ id, vector, payload }]
  });
}

// Поиск похожих векторов
async function searchSimilar(collectionName, queryVector, limit = 10, filter = null) {
  if (!qdrantClient) return [];
  return await qdrantClient.search(collectionName, {
    vector: queryVector,
    limit,
    filter
  });
}

// Удаление вектора по ID
async function deleteVector(collectionName, id) {
  if (!qdrantClient) return null;
  return await qdrantClient.delete(collectionName, {
    points: [id]
  });
}

module.exports = {
  checkQdrantConnection,
  upsertVector,
  searchSimilar,
  deleteVector
};
=======
};

module.exports = { qdrantClient, checkQdrantConnection, isQdrantConfigured };
>>>>>>> d969d102572f3321a56f4fced5f8b7c6b9cb6b70
