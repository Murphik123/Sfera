const { getEmbedding } = require('./embeddingService');
const { qdrantClient } = require('./qdrant');

const COLLECTION_NAME = 'sfera_vectors';

/**
 * Добавление или обновление товара в векторной базе
 */
async function indexProduct(product) {
  try {
    const textToVectorize = `${product.title} ${product.description || ''} ${product.category || ''}`;
    const vector = await getEmbedding(textToVectorize);

    await qdrantClient.upsert(COLLECTION_NAME, {
      points: [
        {
          id: product.id, // ID товара из основной БД (числовой или UUID)
          vector: vector,
          payload: {
            title: product.title,
            price: product.price,
            category: product.category,
            imageUrl: product.imageUrl
          }
        }
      ]
    });
    console.log(`[Qdrant] Товар ID ${product.id} проиндексирован.`);
  } catch (error) {
    console.error(`[Qdrant] Ошибка индексации товара ID ${product.id}:`, error);
  }
}

/**
 * Поиск товаров по смысловому запросу
 */
async function searchProducts(queryText, limit = 10) {
  try {
    const queryVector = await getEmbedding(queryText);

    const result = await qdrantClient.query(COLLECTION_NAME, {
      query: queryVector,
      limit: limit,
      with_payload: true
    });

    return result.points.map(point => ({
      id: point.id,
      score: point.score,
      ...point.payload
    }));
  } catch (error) {
    console.error('[Qdrant] Ошибка при векторном поиске:', error);
    return [];
  }
}

module.exports = { indexProduct, searchProducts };