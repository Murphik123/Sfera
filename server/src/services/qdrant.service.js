const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { QdrantClient } = require('@qdrant/js-client-rest');

const rawUrl = (process.env.QDRANT_URL || '').trim();
const apiKey = (process.env.QDRANT_API_KEY || '').trim();

const host = rawUrl
  .replace(/^https?:\/\//, '')
  .replace(/:[0-9]+.*$/, '')
  .replace(/\/.*$/, '');

const qdrantClient = host
  ? new QdrantClient({
      host: host,
      port: 443,
      https: true,
      apiKey: apiKey,
      checkCompatibility: false
    })
  : null;

module.exports = {
  qdrantClient,
  client: qdrantClient,

  checkQdrantConnection: async () => {
    if (!qdrantClient) return false;
    try {
      const res = await qdrantClient.getCollections();
      console.log(`✅ Qdrant подключен (коллекций: ${res.collections.length})`);
      return true;
    } catch (e) {
      console.error(`❌ Ошибка Qdrant: ${e.message}`);
      return false;
    }
  },

  upsertVector: async (collectionName, { id, vector, payload }) => {
    if (!qdrantClient) {
      throw new Error('Qdrant client не инициализирован. Проверьте QDRANT_URL в server/.env');
    }
    return await qdrantClient.upsert(collectionName, {
      wait: true,
      points: [{ id, vector, payload }]
    });
  },

  searchSimilar: async (collectionName, queryVector, limit = 10, filter = null) => {
    if (!qdrantClient) {
      throw new Error('Qdrant client не инициализирован. Проверьте QDRANT_URL в server/.env');
    }

    const options = {
      limit,
      with_payload: true
    };
    if (filter) options.filter = filter;

    if (typeof qdrantClient.search === 'function') {
      return await qdrantClient.search(collectionName, {
        vector: queryVector,
        ...options
      });
    }

    if (typeof qdrantClient.query === 'function') {
      const res = await qdrantClient.query(collectionName, {
        query: queryVector,
        ...options
      });
      return res.points || res;
    }

    throw new Error('Метод поиска в Qdrant не найден');
  }
};