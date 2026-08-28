import { QdrantClient } from '@qdrant/js-client-rest';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const localEnv = path.resolve(process.cwd(), '.env');
const parentEnv = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(parentEnv)) {
  dotenv.config({ path: parentEnv });
} else {
  dotenv.config();
}

// Передаем строку прокси напрямую в ProxyAgent
const PROXY_URL = process.env.PROXY_URL || 'http://192.168.31.121:65171';

if (process.env.NODE_ENV !== 'production') {
  setGlobalDispatcher(new ProxyAgent(PROXY_URL));
}

const qdrantUrl = process.env.QDRANT_URL || 'https://1846f899-b5af-47c7-80d4-af9221242693.eu-central-1-0.aws.cloud.qdrant.io';
const apiKey = process.env.QDRANT_API_KEY || process.env.QDRANT_KEY;

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
  apiKey: apiKey,
  port: 443,
  checkCompatibility: false,
});
