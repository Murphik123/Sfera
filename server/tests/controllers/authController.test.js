jest.mock('../../src/models/User', () => {
  const model = jest.fn();
  model.findOne = jest.fn();
  return model;
});
jest.mock('../../src/models/Account', () => jest.fn());
jest.mock('../../src/utils/jwt', () => ({ generateToken: jest.fn() }));
jest.mock('../../src/config/redis', () => ({ set: jest.fn(), del: jest.fn() }));

const User = require('../../src/models/User');
const Account = require('../../src/models/Account');
const { generateToken } = require('../../src/utils/jwt');
const redisClient = require('../../src/config/redis');
const authController = require('../../src/controllers/authController');
const { mockReq, mockRes } = require('../helpers/http');

// User и Account используются как конструкторы: подменяем их поведение вручную
const stubUserSave = (impl) => {
  User.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this._id = 'user-1';
    this.save = jest.fn(impl || (() => Promise.resolve(this)));
  });
};

const stubAccountSave = (impl) => {
  Account.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this.save = jest.fn(impl || (() => Promise.resolve(this)));
  });
};

describe('controllers/authController', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    stubUserSave();
    stubAccountSave();
    generateToken.mockReturnValue('signed-token');
    User.findOne.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('register', () => {
    const validBody = { username: 'roman', email: 'Roman@Example.com', password: 'secret1' };

    it('создает пользователя, счет и возвращает токен', async () => {
      const req = mockReq({ body: validBody });
      const res = mockRes();

      await authController.register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'roman@example.com' }, { username: 'roman' }]
      });
      expect(Account).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(generateToken).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toMatchObject({
        token: 'signed-token',
        user: { id: 'user-1', username: 'roman', email: 'roman@example.com', role: 'user' }
      });
    });

    it('не хэширует пароль в контроллере (это делает модель)', async () => {
      const req = mockReq({ body: validBody });

      await authController.register(req, mockRes());

      expect(User).toHaveBeenCalledWith(expect.objectContaining({ password: 'secret1' }));
    });

    it('назначает роль admin только при явном значении admin', async () => {
      await authController.register(mockReq({ body: { ...validBody, role: 'admin' } }), mockRes());
      expect(User).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));

      await authController.register(mockReq({ body: { ...validBody, role: 'moderator' } }), mockRes());
      expect(User).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'user' }));
    });

    it.each([
      ['без username', { email: 'a@b.co', password: 'secret1' }],
      ['без email', { username: 'roman', password: 'secret1' }],
      ['без пароля', { username: 'roman', email: 'a@b.co' }]
    ])('возвращает 400 %s', async (_label, body) => {
      const res = mockRes();

      await authController.register(mockReq({ body }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Укажите логин, email и пароль' });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('возвращает 400, если email или логин уже заняты', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing' });
      const res = mockRes();

      await authController.register(mockReq({ body: validBody }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({
        message: 'Пользователь с таким email или логином уже существует'
      });
    });

    it('регистрирует пользователя, даже если создать счет не удалось', async () => {
      stubAccountSave(() => Promise.reject(new Error('duplicate account')));
      const res = mockRes();

      await authController.register(mockReq({ body: validBody }), res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.token).toBe('signed-token');
    });

    it('возвращает 500, если сохранение пользователя упало', async () => {
      stubUserSave(() => Promise.reject(new Error('validation failed')));
      const res = mockRes();

      await authController.register(mockReq({ body: validBody }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при регистрации', error: 'validation failed' });
    });
  });

  describe('login', () => {
    const credentials = { email: 'Roman@Example.com', password: 'secret1' };
    const activeUser = (overrides = {}) => ({
      _id: 'user-1',
      username: 'roman',
      email: 'roman@example.com',
      role: 'user',
      isBlocked: false,
      comparePassword: jest.fn().mockResolvedValue(true),
      ...overrides
    });

    it('выдает токен и сохраняет сессию в Redis', async () => {
      const user = activeUser();
      User.findOne.mockResolvedValue(user);
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'roman@example.com' });
      expect(user.comparePassword).toHaveBeenCalledWith('secret1');
      expect(redisClient.set).toHaveBeenCalledWith('session:user-1', 'signed-token');
      expect(res.body).toMatchObject({ token: 'signed-token', user: { id: 'user-1', role: 'user' } });
    });

    it('подставляет роль user и пустой аватар по умолчанию', async () => {
      User.findOne.mockResolvedValue(activeUser({ role: undefined, avatar: undefined }));
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.body.user).toMatchObject({ role: 'user', avatar: '' });
    });

    it.each([
      ['без email', { password: 'secret1' }],
      ['без пароля', { email: 'a@b.co' }]
    ])('возвращает 400 %s', async (_label, body) => {
      const res = mockRes();

      await authController.login(mockReq({ body }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Укажите email и пароль' });
    });

    it('возвращает 401, если пользователя нет', async () => {
      User.findOne.mockResolvedValue(null);
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({ message: 'Неверный email или пароль' });
    });

    it('возвращает 403 для заблокированного аккаунта', async () => {
      User.findOne.mockResolvedValue(activeUser({ isBlocked: true }));
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body).toEqual({ message: 'Аккаунт заблокирован' });
    });

    it('возвращает 401 при неверном пароле', async () => {
      User.findOne.mockResolvedValue(activeUser({ comparePassword: jest.fn().mockResolvedValue(false) }));
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({ message: 'Неверный email или пароль' });
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('выполняет вход, даже если Redis недоступен', async () => {
      User.findOne.mockResolvedValue(activeUser());
      redisClient.set.mockRejectedValue(new Error('redis down'));
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.body.token).toBe('signed-token');
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    it('возвращает 500 при ошибке базы', async () => {
      User.findOne.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await authController.login(mockReq({ body: credentials }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при входе', error: 'db down' });
    });
  });

  describe('logout', () => {
    it('удаляет сессию текущего пользователя', async () => {
      const res = mockRes();

      await authController.logout(mockReq({ userId: 'user-1' }), res);

      expect(redisClient.del).toHaveBeenCalledWith('session:user-1');
      expect(res.body).toEqual({ message: 'Успешный выход из системы' });
    });

    it('не обращается к Redis без userId', async () => {
      const res = mockRes();

      await authController.logout(mockReq(), res);

      expect(redisClient.del).not.toHaveBeenCalled();
      expect(res.body).toEqual({ message: 'Успешный выход из системы' });
    });

    it('возвращает 500 при ошибке Redis', async () => {
      redisClient.del.mockRejectedValue(new Error('redis down'));
      const res = mockRes();

      await authController.logout(mockReq({ userId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при выходе', error: 'redis down' });
    });
  });

  describe('getMe', () => {
    it('отдает профиль из req.user', async () => {
      const req = mockReq({
        user: { _id: 'user-1', username: 'roman', email: 'roman@example.com', role: 'admin', avatar: 'a.png' }
      });
      const res = mockRes();

      await authController.getMe(req, res);

      expect(res.body).toEqual({
        user: { id: 'user-1', username: 'roman', email: 'roman@example.com', role: 'admin', avatar: 'a.png' }
      });
    });

    it('возвращает 500, если req.user отсутствует', async () => {
      const res = mockRes();

      await authController.getMe(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body.message).toBe('Ошибка при получении профиля');
    });
  });
});
