const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { QdrantClient } = require('@qdrant/js-client-rest');
const { ProxyAgent, fetch: undiciFetch } = require('undici');

// Прокси Psiphon
const proxyAgent = new ProxyAgent('http://127.0.0.1:65171');

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'https://1846f899-b5af-47c7-80d4-af9221242693.eu-central-1-0.aws.cloud.qdrant.io',
  port: 443,
  apiKey: process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6YmU3YzhiZGItMGE3YS00M2JhLWFkOTctNzk2YmQwODg1OTRkIn0.X85NBW1oW7hfBZ9ZXKA4HJAHvX4VIF6fRM4F51XJOZQ',
  checkCompatibility: false,
  customFetch: (url, options) => {
    return undiciFetch(url, { ...options, dispatcher: proxyAgent });
  }
});

async function testQdrantConnection() {
  try {
    const collections = await qdrantClient.getCollections();
    console.log('🔗 Подключение к Qdrant Cloud (порт 443)...');
    console.log('✅ Успешное подключение к Qdrant Cloud!');
    console.log('Список коллекций:', collections.collections);
  } catch (err) {
    console.error('❌ Ошибка подключения к Qdrant:', err.message);
  }
}

module.exports = { qdrantClient, testQdrantConnection };