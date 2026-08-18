const { QdrantClient } = require('@qdrant/js-client-rest');

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const qdrantClient = QDRANT_URL
  ? new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY })
  : null;

async function checkQdrantConnection() {
  if (!qdrantClient) {
    console.warn('⚠️ Qdrant: QDRANT_URL не задана');
    return false;
  }
  try {
    const collections = await qdrantClient.getCollections();
    console.log(`✅ Qdrant подключен: ${QDRANT_URL} (коллекций: ${collections.collections.length})`);
    return true;
  } catch (error) {
    console.error(`❌ Qdrant недоступен (${QDRANT_URL}): ${error.message}`);
    return false;
  }
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
