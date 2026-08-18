jest.mock('../../src/models/Prediction', () => {
  const model = jest.fn();
  model.find = jest.fn();
  return model;
});

const Prediction = require('../../src/models/Prediction');
const aiController = require('../../src/controllers/aiController');
const predictionController = require('../../src/controllers/predictionController');
const { mockReq, mockRes } = require('../helpers/http');

// Prediction.find().sort().limit()
const stubFindQuery = (result) => {
  const chain = {
    sort: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(result))
  };
  Prediction.find.mockReturnValue(chain);
  return chain;
};

describe('controllers/aiController', () => {
  describe('getPredictions', () => {
    it('возвращает последние 30 прогнозов по дате', async () => {
      const predictions = [{ _id: 'p-1' }];
      const chain = stubFindQuery(predictions);
      const res = mockRes();

      await aiController.getPredictions(mockReq(), res);

      expect(chain.sort).toHaveBeenCalledWith({ date: -1 });
      expect(chain.limit).toHaveBeenCalledWith(30);
      expect(res.body).toBe(predictions);
    });

    it('возвращает 500 при ошибке базы', async () => {
      Prediction.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await aiController.getPredictions(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ error: 'db down' });
    });
  });

  describe('createPrediction', () => {
    beforeEach(() => {
      Prediction.mockImplementation(function (fields) {
        Object.assign(this, fields);
        this.save = jest.fn().mockResolvedValue(this);
      });
    });

    it('создает прогноз с переданной датой', async () => {
      const date = '2024-05-01';
      const res = mockRes();

      await aiController.createPrediction(
        mockReq({ body: { predictedPrice: 15, confidence: 0.7, date } }),
        res
      );

      expect(Prediction).toHaveBeenCalledWith({ date, predictedPrice: 15, confidence: 0.7 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('подставляет текущую дату, если она не передана', async () => {
      await aiController.createPrediction(mockReq({ body: { predictedPrice: 15 } }), mockRes());

      expect(Prediction).toHaveBeenCalledWith(
        expect.objectContaining({ date: expect.any(Date) })
      );
    });

    it('возвращает 500, если сохранение упало', async () => {
      Prediction.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('db down'));
      });
      const res = mockRes();

      await aiController.createPrediction(mockReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ error: 'db down' });
    });
  });
});

describe('controllers/predictionController.getPredictions', () => {
  it('возвращает заготовленную аналитику со статусом success', async () => {
    const res = mockRes();

    await predictionController.getPredictions(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({ status: 'success' });
    expect(res.body.timestamp).toBeInstanceOf(Date);
    expect(res.body.predictions).toHaveLength(2);
  });

  it('возвращает 500, если формирование ответа упало', async () => {
    const res = mockRes();
    res.json.mockImplementationOnce(() => {
      throw new Error('serialization failed');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await predictionController.getPredictions(mockReq(), res);

    expect(res.status).toHaveBeenLastCalledWith(500);
  });
});
