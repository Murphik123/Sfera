const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { ProxyAgent, fetch: undiciFetch } = require('undici');

// На локальном ПК используем Psiphon, на Render — прямое соединение
const proxyUrl = process.env.HTTP_PROXY || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:65171' : null);
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

/**
 * Превращает текст в вектор из 768 чисел через Gemini API
 * @param {string} text - Текст для векторизации
 * @returns {Promise<number[]>} - Массив чисел (вектор)
 */
async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Критическая ошибка: GEMINI_API_KEY не найден в переменных окружения.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    }),
  };

  // Подключаем прокси только если он задан
  if (proxyAgent) {
    fetchOptions.dispatcher = proxyAgent;
  }

  const response = await undiciFetch(url, fetchOptions);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  if (!data.embedding || !data.embedding.values) {
    throw new Error('Некорректный ответ от Gemini API: отсутствует вектор');
  }

  return data.embedding.values;
}

module.exports = { getEmbedding };