const predictionController = require('../../src/controllers/predictionController');
const { mockReq, mockRes } = require('../helpers/http');

describe('controllers/predictionController', () => {
  it('возвращает прогнозы со статусом success', async () => {
    const res = mockRes();

    await predictionController.getPredictions(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.predictions).toHaveLength(2);
    expect(payload.predictions[0]).toEqual({
      id: 1,
      title: 'Прогноз спроса на маркетплейсе',
      score: 0.89
    });
  });

  it('возвращает 500 при ошибке формирования ответа', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    res.status.mockImplementationOnce(() => {
      throw new Error('render failed');
    });

    await predictionController.getPredictions(mockReq(), res);

    expect(res.status).toHaveBeenLastCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ошибка сервера при расчете прогноза' });
  });
});
