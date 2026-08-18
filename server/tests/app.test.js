jest.mock('../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = { _id: 'user-1' };
    next();
  })
}));

jest.mock('../src/routes/chatRoutes', () => {
  const router = require('express').Router();
  router.get('/ping', (req, res) => res.json({ scope: 'chat', user: req.user }));
  return router;
});

jest.mock('../src/routes/marketplaceRoutes', () => {
  const router = require('express').Router();
  router.get('/ping', (req, res) => res.json({ scope: 'marketplace' }));
  return router;
});

jest.mock('../src/routes/mailRoutes', () => require('express').Router());
jest.mock('../src/routes/bankRoutes', () => require('express').Router());
jest.mock('../src/routes/aiRoutes', () => {
  const router = require('express').Router();
  router.get('/boom', () => {
    throw new Error('ai upstream failed');
  });
  return router;
});

const request = require('supertest');
const app = require('../src/app');
const { authMiddleware } = require('../src/middleware/auth');

describe('app', () => {
  beforeEach(() => {
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { _id: 'user-1' };
      next();
    });
  });

  it('монтирует публичные маршруты статистики без авторизации', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.online).toBe(1842);
    expect(authMiddleware).not.toHaveBeenCalled();
  });

  it('монтирует публичные маршруты авторизации', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(authMiddleware).not.toHaveBeenCalled();
  });

  it('защищает приватные API авторизацией и передает пользователя в маршрут', async () => {
    const res = await request(app).get('/api/chat/ping');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ scope: 'chat', user: { _id: 'user-1' } });
    expect(authMiddleware).toHaveBeenCalledTimes(1);
  });

  it('возвращает 401, если авторизация не пройдена', async () => {
    authMiddleware.mockImplementation((req, res) => res.status(401).json({ message: 'Нет доступа' }));

    const res = await request(app).get('/api/marketplace/ping');

    expect(res.status).toBe(401);
  });

  it('устанавливает заголовки helmet и CORS', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('разрешает preflight-запросы', async () => {
    const res = await request(app)
      .options('/api/chat/ping')
      .set('Origin', 'https://sfera.tm')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,Authorization');
  });

  it('парсит JSON-тело запроса', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret1' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('отдает index.html как SPA-фолбэк для неизвестных путей', async () => {
    const res = await request(app).get('/some/unknown/page');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch('text/html');
  });

  it('обрабатывает ошибки маршрутов через errorHandler', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/api/ai/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'ai upstream failed' });
  });
});
