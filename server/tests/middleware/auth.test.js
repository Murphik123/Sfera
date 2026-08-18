const jwt = require('jsonwebtoken');

jest.mock('../../src/config/redis', () => ({ isOpen: false, get: jest.fn() }));
jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));

const redisClient = require('../../src/config/redis');
const User = require('../../src/models/User');
const authMiddleware = require('../../src/middleware/auth');
const { mockReq, mockRes } = require('../helpers/http');

const SECRET = 'test-secret';
const signFor = (userId) => jwt.sign({ userId }, SECRET);

const mockUserLookup = (user) => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
};

describe('middleware/auth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    redisClient.isOpen = false;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  it('экспортируется как функция и как свойства authMiddleware/protect', () => {
    expect(typeof authMiddleware).toBe('function');
    expect(authMiddleware.authMiddleware).toBe(authMiddleware);
    expect(authMiddleware.protect).toBe(authMiddleware);
  });

  it('пропускает запрос и заполняет req.user/req.userId по Bearer-токену', async () => {
    const user = { _id: 'user-1', username: 'roman' };
    mockUserLookup(user);
    const req = mockReq({ headers: { authorization: `Bearer ${signFor('user-1')}` } });
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBe(user);
    expect(req.userId).toBe('user-1');
    expect(User.findById).toHaveBeenCalledWith('user-1');
  });

  it('принимает токен без префикса Bearer', async () => {
    mockUserLookup({ _id: 'user-1' });
    const req = mockReq({ headers: { authorization: signFor('user-1') } });
    const next = jest.fn();

    await authMiddleware(req, mockRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('читает заголовок Authorization с большой буквы', async () => {
    mockUserLookup({ _id: 'user-1' });
    const req = mockReq({ headers: { Authorization: `Bearer ${signFor('user-1')}` } });
    const next = jest.fn();

    await authMiddleware(req, mockRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('возвращает 401, если токен не передан', async () => {
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401 для невалидного токена', async () => {
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(mockReq({ headers: { authorization: 'Bearer broken.token' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.message).toBe('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401, если пользователь удален из базы', async () => {
    mockUserLookup(null);
    const res = mockRes();
    const next = jest.fn();

    await authMiddleware(mockReq({ headers: { authorization: `Bearer ${signFor('ghost')}` } }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ message: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  describe('проверка сессии в Redis', () => {
    beforeEach(() => {
      redisClient.isOpen = true;
      mockUserLookup({ _id: 'user-1' });
    });

    it('отклоняет токен, если в Redis лежит другая сессия', async () => {
      redisClient.get.mockResolvedValue('another-token');
      const res = mockRes();
      const next = jest.fn();

      await authMiddleware(mockReq({ headers: { authorization: `Bearer ${signFor('user-1')}` } }), res, next);

      expect(redisClient.get).toHaveBeenCalledWith('session:user-1');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({ message: 'Invalid session' });
      expect(next).not.toHaveBeenCalled();
    });

    it('пропускает запрос, если сессия совпадает с токеном', async () => {
      const token = signFor('user-1');
      redisClient.get.mockResolvedValue(token);
      const next = jest.fn();

      await authMiddleware(mockReq({ headers: { authorization: `Bearer ${token}` } }), mockRes(), next);

      expect(next).toHaveBeenCalled();
    });

    it('не блокирует запрос при ошибке Redis', async () => {
      redisClient.get.mockRejectedValue(new Error('redis down'));
      const next = jest.fn();

      await authMiddleware(mockReq({ headers: { authorization: `Bearer ${signFor('user-1')}` } }), mockRes(), next);

      expect(next).toHaveBeenCalled();
    });
  });
});
