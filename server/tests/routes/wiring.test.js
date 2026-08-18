const request = require('supertest');
const express = require('express');

// Список зарегистрированных маршрутов роутера в виде "МЕТОД путь"
const routesOf = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`)
    );

const handlerCount = (router, method, routePath) => {
  const layer = router.stack.find(
    (item) => item.route && item.route.path === routePath && item.route.methods[method]
  );
  return layer.route.stack.length;
};

describe('routes: подключение контроллеров', () => {
  it('bankRoutes отдает банковские операции', () => {
    expect(routesOf(require('../../src/routes/bankRoutes'))).toEqual([
      'GET /balance',
      'POST /transfer',
      'GET /transactions'
    ]);
  });

  it('marketplaceRoutes отдает объявления и заказы', () => {
    expect(routesOf(require('../../src/routes/marketplaceRoutes'))).toEqual([
      'GET /listings',
      'POST /listings',
      'POST /orders'
    ]);
  });

  it('aiRoutes отдает прогнозы', () => {
    expect(routesOf(require('../../src/routes/aiRoutes'))).toEqual([
      'GET /predictions',
      'POST /predictions'
    ]);
  });

  it('predictionRoutes экспортирует роутер с корневым GET', () => {
    expect(routesOf(require('../../src/routes/predictionRoutes'))).toEqual(['GET /']);
  });

  it('chatRoutes объявляет статические маршруты раньше динамических', () => {
    expect(routesOf(require('../../src/routes/chatRoutes'))).toEqual([
      'GET /dialogs',
      'POST /send',
      'PUT /read/:messageId',
      'GET /:userId'
    ]);
  });

  it('paymentRoutes защищает все маршруты через protect', () => {
    const router = require('../../src/routes/paymentRoutes');
    const { protect } = require('../../src/middleware/auth');

    expect(router.stack[0].route).toBeUndefined();
    expect(router.stack[0].handle).toBe(protect);
    expect(routesOf(router)).toEqual([
      'GET /wallet',
      'POST /transfer',
      'POST /deposit',
      'GET /transactions'
    ]);
  });

  it('adminRoutes защищает все маршруты через adminAuth', () => {
    const router = require('../../src/routes/adminRoutes');
    const { adminAuth } = require('../../src/middleware/adminAuth');

    expect(router.stack[0].handle).toBe(adminAuth);
    expect(routesOf(router)).toEqual([
      'GET /stats',
      'GET /users',
      'GET /users/:id',
      'PUT /users/:id',
      'DELETE /users/:id',
      'GET /transactions',
      'GET /listings',
      'PUT /listings/:id',
      'DELETE /listings/:id',
      'GET /mails',
      'DELETE /mails/:id',
      'GET /predictions',
      'POST /predictions',
      'DELETE /predictions/:id'
    ]);
  });

  it('listingRoutes оставляет чтение публичным, а запись защищает и принимает файлы', () => {
    const router = require('../../src/routes/listingRoutes');

    expect(routesOf(router)).toEqual([
      'GET /',
      'GET /:id',
      'POST /',
      'PUT /:id',
      'DELETE /:id'
    ]);
    expect(handlerCount(router, 'get', '/')).toBe(1);
    // protect + upload.array + контроллер
    expect(handlerCount(router, 'post', '/')).toBe(3);
    expect(handlerCount(router, 'delete', '/:id')).toBe(2);
  });

  describe('mailRoutes', () => {
    it('подключает отправку письма и заглушку модуля', async () => {
      const router = require('../../src/routes/mailRoutes');

      expect(routesOf(router)).toEqual(['POST /send', 'GET /']);

      const app = express();
      app.use('/api/mail', router);
      const res = await request(app).get('/api/mail');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Модуль почты активен' });
    });

    it('не регистрирует /send, если контроллер не экспортирует sendMail', () => {
      jest.resetModules();
      jest.doMock('../../src/controllers/mailController', () => ({}));

      const router = require('../../src/routes/mailRoutes');

      expect(routesOf(router)).toEqual(['GET /']);
    });
  });

  describe('userRoutes', () => {
    const buildApp = () => {
      const app = express();
      app.use(express.json());
      app.use('/api/users', require('../../src/routes/userRoutes'));
      return app;
    };

    beforeEach(() => {
      jest.resetModules();
      jest.doMock('../../src/middleware/auth', () => (req, res, next) => {
        req.user = { _id: 'user-1', username: 'roman' };
        next();
      });
    });

    it('возвращает профиль текущего пользователя', async () => {
      const res = await request(buildApp()).get('/api/users/profile');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, user: { _id: 'user-1', username: 'roman' } });
    });

    it('подтверждает обновление профиля', async () => {
      const res = await request(buildApp()).put('/api/users/profile').send({ username: 'new' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Профиль обновлен' });
    });
  });
});
