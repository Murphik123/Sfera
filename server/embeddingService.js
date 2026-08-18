const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { ProxyAgent, fetch: undiciFetch } = require('undici');

// Настройка прокси Psiphon
const proxyAgent = new ProxyAgent('http://127.0.0.1:65171');

/**
 * Превращает текст в вектор из 768 чисел через Gemini API
 * @param {string} text - Текст для векторизации
 * @returns {Promise<number[]>} - Массив чисел (вектор)
 */
async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JyT6dwuBv7KTVOSG4zxzOSyUj3PSmhyZD6O9D1TS7zxA';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const response = await undiciFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    dispatcher: proxyAgent,
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  return data.embedding.values;
}

module.exports = { getEmbedding };