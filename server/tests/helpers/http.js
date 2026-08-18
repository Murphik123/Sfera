// Минимальные заглушки Express req/res для юнит-тестов контроллеров и middleware.

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (payload) {
      this.body = payload;
      return this;
    })
  };
  return res;
};

const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

const mockIo = () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  return { to, emit };
};

// req.app.get('io') используется контроллерами для realtime-оповещений
const mockAppWithIo = (io) => ({ get: jest.fn((key) => (key === 'io' ? io : undefined)) });

module.exports = { mockRes, mockReq, mockIo, mockAppWithIo };
