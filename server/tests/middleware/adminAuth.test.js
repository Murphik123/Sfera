jest.mock('../../src/middleware/auth', () => {
  const fn = jest.fn();
  fn.authMiddleware = fn;
  fn.protect = fn;
  return fn;
});

const authMiddleware = require('../../src/middleware/auth');
const { adminAuth } = require('../../src/middleware/adminAuth');
const { mockReq, mockRes } = require('../helpers/http');

// Базовая аутентификация имитируется: она либо заполняет req.user, либо отдает ошибку
const authSucceedsAs = (user) => {
  authMiddleware.mockImplementation((req, res, next) => {
    req.user = user;
    next();
  });
};

describe('middleware/adminAuth', () => {
  it('пропускает администратора', async () => {
    authSucceedsAs({ _id: 'user-1', role: 'admin' });
    const res = mockRes();
    const next = jest.fn();

    await adminAuth(mockReq(), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('возвращает 403 обычному пользователю', async () => {
    authSucceedsAs({ _id: 'user-2', role: 'user' });
    const res = mockRes();
    const next = jest.fn();

    await adminAuth(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ message: 'Access denied. Admin only.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 403, если пользователь не был загружен', async () => {
    authSucceedsAs(undefined);
    const res = mockRes();
    const next = jest.fn();

    await adminAuth(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('возвращает 401, если базовая аутентификация вернула ошибку', async () => {
    authMiddleware.mockImplementation((req, res, next) => next(new Error('bad token')));
    const res = mockRes();
    const next = jest.fn();

    await adminAuth(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});
