
// Локальный векторный генератор на чистом JS (384 измерения)
// Не требует сети, npm-пакетов и скачивания внешних моделей
async function getEmbedding(text) {
  const dimensions = 384;
  const vector = new Array(dimensions).fill(0);

  if (!text || typeof text !== 'string') return vector;

  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Собираем слова и символьные триграммы (для точной обработки русского языка)
  const tokens = [...words];
  for (let i = 0; i < normalized.length - 2; i++) {
    tokens.push(normalized.slice(i, i + 3));
  }

  // Хешируем токены по измерениям вектора
  tokens.forEach((token) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1;
  });

  // L2-нормализация вектора для косинусного сходства в Qdrant
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;

  return vector.map((val) => Number((val / magnitude).toFixed(6)));
}

module.exports = getEmbedding;