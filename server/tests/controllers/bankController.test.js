jest.mock('../../src/models/Account', () => {
  const model = jest.fn();
  model.findOne = jest.fn();
  model.create = jest.fn();
  model.findOneAndUpdate = jest.fn();
  return model;
});
jest.mock('../../src/models/Transaction', () => {
  const model = jest.fn();
  model.find = jest.fn();
  return model;
});

const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const bankController = require('../../src/controllers/bankController');
const { mockReq, mockRes, mockIo, mockAppWithIo } = require('../helpers/http');

const stubTransactionSave = (impl) => {
  Transaction.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this._id = 'tx-1';
    this.save = jest.fn(impl || (() => Promise.resolve(this)));
  });
};

// Transaction.find(...).populate().populate().sort()
const stubTransactionQuery = (result) => {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => Promise.resolve(result))
  };
  Transaction.find.mockReturnValue(chain);
  return chain;
};

describe('controllers/bankController', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    stubTransactionSave();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getBalance', () => {
    it('возвращает баланс существующего счета', async () => {
      Account.findOne.mockResolvedValue({ balance: 250, currency: 'TMT' });
      const res = mockRes();

      await bankController.getBalance(mockReq({ userId: 'user-1' }), res);

      expect(Account.findOne).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(Account.create).not.toHaveBeenCalled();
      expect(res.body).toEqual({ balance: 250, currency: 'TMT' });
    });

    it('создает счет с нулевым балансом, если его нет', async () => {
      Account.findOne.mockResolvedValue(null);
      Account.create.mockResolvedValue({ balance: 0, currency: 'TMT' });
      const res = mockRes();

      await bankController.getBalance(mockReq({ userId: 'user-1' }), res);

      expect(Account.create).toHaveBeenCalledWith({ userId: 'user-1', balance: 0 });
      expect(res.body).toEqual({ balance: 0, currency: 'TMT' });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Account.findOne.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await bankController.getBalance(mockReq({ userId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка получения баланса', error: 'db down' });
    });
  });

  describe('transfer', () => {
    const transferReq = (body, io) =>
      mockReq({ userId: 'user-1', body, app: mockAppWithIo(io) });

    it('списывает средства атомарно, зачисляет получателю и создает транзакцию', async () => {
      Account.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'acc-1', balance: 50 })
        .mockResolvedValueOnce({ _id: 'acc-2', balance: 150 });
      const io = mockIo();
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 100 }, io), res);

      expect(Account.findOneAndUpdate).toHaveBeenNthCalledWith(
        1,
        { userId: 'user-1', balance: { $gte: 100 } },
        { $inc: { balance: -100 } },
        { new: true }
      );
      expect(Account.findOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        { userId: 'user-2' },
        { $inc: { balance: 100 } },
        { new: true, upsert: true }
      );
      expect(Transaction).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100, type: 'transfer', status: 'completed' })
      );
      expect(res.body).toMatchObject({ message: 'Перевод успешно выполнен', newBalance: 50 });
    });

    it('оповещает получателя через socket.io', async () => {
      Account.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'acc-1', balance: 0 })
        .mockResolvedValueOnce({ _id: 'acc-2', balance: 100 });
      const io = mockIo();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 100 }, io), mockRes());

      expect(io.to).toHaveBeenCalledWith('user-2');
      expect(io.emit).toHaveBeenCalledWith('balance_updated', { newBalance: 100, received: 100 });
    });

    it('выполняет перевод, если socket.io не инициализирован', async () => {
      Account.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'acc-1', balance: 0 })
        .mockResolvedValueOnce({ _id: 'acc-2', balance: 100 });
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 100 }, undefined), res);

      expect(res.body.message).toBe('Перевод успешно выполнен');
    });

    it('использует описание по умолчанию', async () => {
      Account.findOneAndUpdate
        .mockResolvedValueOnce({ _id: 'acc-1', balance: 0 })
        .mockResolvedValueOnce({ _id: 'acc-2', balance: 100 });

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 100 }), mockRes());

      expect(Transaction).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Перевод внутри системы SFERA' })
      );
    });

    it.each([
      ['нулевой суммы', 0],
      ['отрицательной суммы', -5],
      ['нечисловой суммы', 'abc'],
      ['отсутствующей суммы', undefined]
    ])('возвращает 400 для %s', async (_label, amount) => {
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Сумма перевода должна быть больше нуля' });
      expect(Account.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('запрещает перевод самому себе', async () => {
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-1', amount: 10 }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Нельзя перевести средства самому себе' });
      expect(Account.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('возвращает 400 при недостатке средств и не зачисляет получателю', async () => {
      Account.findOneAndUpdate.mockResolvedValueOnce(null);
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 1000 }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Недостаточно средств или счет не найден' });
      expect(Account.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(Transaction).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке во время перевода', async () => {
      Account.findOneAndUpdate.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await bankController.transfer(transferReq({ toUserId: 'user-2', amount: 10 }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при выполнении перевода', error: 'db down' });
    });
  });

  describe('getTransactions', () => {
    it('возвращает историю по счету пользователя', async () => {
      Account.findOne.mockResolvedValue({ _id: 'acc-1' });
      const transactions = [{ _id: 'tx-1' }];
      const chain = stubTransactionQuery(transactions);
      const res = mockRes();

      await bankController.getTransactions(mockReq({ userId: 'user-1' }), res);

      expect(Transaction.find).toHaveBeenCalledWith({
        $or: [{ fromAccount: 'acc-1' }, { toAccount: 'acc-1' }]
      });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.body).toBe(transactions);
    });

    it('возвращает пустой список, если счета нет', async () => {
      Account.findOne.mockResolvedValue(null);
      const res = mockRes();

      await bankController.getTransactions(mockReq({ userId: 'user-1' }), res);

      expect(res.body).toEqual([]);
      expect(Transaction.find).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке базы', async () => {
      Account.findOne.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await bankController.getTransactions(mockReq({ userId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка получения историй транзакций', error: 'db down' });
    });
  });
});
