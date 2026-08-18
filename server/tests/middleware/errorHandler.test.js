const errorHandler = require('../../src/middleware/errorHandler');
const { mockReq, mockRes } = require('../helpers/http');

describe('middleware/errorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('использует статус и сообщение из ошибки', () => {
    const res = mockRes();
    const err = Object.assign(new Error('Not found'), { status: 404 });

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: 'Not found' });
  });

  it('по умолчанию отдает 500 и Internal Server Error', () => {
    const res = mockRes();
    const err = new Error('');

    errorHandler(err, mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({ message: 'Internal Server Error' });
  });
});
