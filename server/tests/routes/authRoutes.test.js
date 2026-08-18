const express = require('express');
const request = require('supertest');
const authRoutes = require('../../src/routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('routes/authRoutes', () => {
  describe('POST /login', () => {
    it('возвращает токен и профиль обычного пользователя', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'User@Example.com', password: 'secret1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        email: 'User@Example.com',
        name: 'User',
        role: 'user'
      });
      expect(res.body.token).toMatch(/^sfera_token_usr_\d+_user_\d+$/);
    });

    it('выдает роль admin, если email содержит admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ADMIN@sfera.tm', password: 'secret1' });

      expect(res.body.user).toMatchObject({ id: 'usr_admin_1', role: 'admin' });
      expect(res.body.token).toContain('usr_admin_1_admin');
    });

    it.each([
      ['без пароля', { email: 'user@example.com' }],
      ['без email', { password: 'secret1' }],
      ['без данных', {}]
    ])('требует email и пароль (%s)', async (_name, payload) => {
      const res = await request(app).post('/api/auth/login').send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'Пожалуйста, укажите email и пароль'
      });
    });
  });

  describe('POST /register', () => {
    it('регистрирует пользователя и возвращает 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'secret1', name: 'Новый' });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: 'new@example.com',
        name: 'Новый',
        role: 'user'
      });
      expect(res.body.token).toContain('_user_');
    });

    it('берет имя из email, если оно не передано', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'roman@example.com', password: 'secret1' });

      expect(res.body.user.name).toBe('roman');
    });

    it('требует email и пароль', async () => {
      const res = await request(app).post('/api/auth/register').send({ name: 'Новый' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Заполните обязательные поля');
    });
  });

  describe('GET /me', () => {
    it('возвращает 401 без заголовка авторизации', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Токен авторизации отсутствует');
    });

    it('распознает администратора по токену', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer sfera_token_usr_admin_1_admin_1');

      expect(res.body.user).toMatchObject({ id: 'usr_admin_1', role: 'admin' });
    });

    it('принимает токен без префикса Bearer', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'sfera_token_usr_1_user_1');

      expect(res.body.user).toMatchObject({ id: 'usr_regular_1', role: 'user' });
    });
  });

  it('POST /logout завершает сессию', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Сессия успешно завершена' });
  });
});
