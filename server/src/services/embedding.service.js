/**
 * Генератор эмбеддингов для текстов Sfera
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Текст для эмбеддинга обязателен');
  }

  if (process.env.EMBEDDING_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMBEDDING_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (err) {
      console.error('Ошибка создания эмбеддинга через API:', err.message);
    }
  }

  return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
}

module.exports = { generateEmbedding };
