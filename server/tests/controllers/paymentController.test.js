jest.mock('mongoose', () => ({ startSession: jest.fn() }));
jest.mock('../../src/models/Wallet', () => {
  const model = jest.fn();
  model.findOne = jest.fn();
  model.create = jest.fn();
  return model;
});
jest.mock('../../src/models/Transaction', () => {
  const model = jest.fn();
  model.find = jest.fn();
  model.create = jest.fn();
  model.countDocuments = jest.fn();
  return model;
});

const mongoose = require('mongoose');
const Wallet = require('../../src/models/Wallet');
const Transaction = require('../../src/models/Transaction');
const paymentController = require('../../src/controllers/paymentController');
const { mockReq, mockRes } = require('../helpers/http');

const stubSession = () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn()
  };
  mongoose.startSession.mockResolvedValue(session);
  return session;
};

// Wallet.findOne(...).session(session) внутри транзакции
const stubWalletInSession = (...wallets) => {
  wallets.forEach((wallet) => {
    Wallet.findOne.mockReturnValueOnce({ session: jest.fn().mockResolvedValue(wallet) });
  });
};

const walletDoc = (fields) => ({ balance: 0, tmCoinBalance: 0, save: jest.fn().mockResolvedValue(undefined), ...fields });

const stubTransactionSave = () => {
  Transaction.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this.save = jest.fn().mockResolvedValue(this);
  });
};

describe('controllers/paymentController', () => {
  beforeEach(() => {
    stubTransactionSave();
  });

  describe('getWallet', () => {
    it('возвращает существующий кошелек', async () => {
      const wallet = walletDoc({ userId: 'user-1', balance: 10 });
      Wallet.findOne.mockResolvedValue(wallet);
      const res = mockRes();

      await paymentController.getWallet(mockReq({ user: { _id: 'user-1' } }), res);

      expect(Wallet.findOne).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(Wallet.create).not.toHaveBeenCalled();
      expect(res.body).toBe(wallet);
    });

    it('создает кошелек, если его нет', async () => {
      Wallet.findOne.mockResolvedValue(null);
      const created = walletDoc({ userId: 'user-1' });
      Wallet.create.mockResolvedValue(created);
      const res = mockRes();

      await paymentController.getWallet(mockReq({ user: { _id: 'user-1' } }), res);

      expect(Wallet.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(res.body).toBe(created);
    });

    it('возвращает 500 при ошибке базы', async () => {
      Wallet.findOne.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await paymentController.getWallet(mockReq({ user: { _id: 'user-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });
  });

  describe('transfer', () => {
    const transferReq = (body) => mockReq({ user: { _id: 'user-1' }, body });

    it('переводит TMT, сохраняет кошельки и транзакцию, коммитит сессию', async () => {
      const session = stubSession();
      const sender = walletDoc({ balance: 500 });
      const recipient = walletDoc({ balance: 20 });
      stubWalletInSession(sender, recipient);
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount: 100 }), res);

      expect(sender.balance).toBe(400);
      expect(recipient.balance).toBe(120);
      expect(sender.save).toHaveBeenCalledWith({ session });
      expect(recipient.save).toHaveBeenCalledWith({ session });
      expect(Transaction).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: 'user-1',
          recipient: 'user-2',
          amount: 100,
          currency: 'TMT',
          type: 'transfer',
          status: 'completed',
          description: 'Внутренний перевод'
        })
      );
      expect(session.commitTransaction).toHaveBeenCalled();
      expect(session.endSession).toHaveBeenCalled();
      expect(res.body.message).toBe('Перевод успешно выполнен');
    });

    it('переводит TM_COIN, не затрагивая баланс TMT', async () => {
      stubSession();
      const sender = walletDoc({ balance: 500, tmCoinBalance: 30 });
      const recipient = walletDoc({ balance: 0, tmCoinBalance: 0 });
      stubWalletInSession(sender, recipient);

      await paymentController.transfer(
        transferReq({ recipientId: 'user-2', amount: 10, currency: 'TM_COIN' }),
        mockRes()
      );

      expect(sender.tmCoinBalance).toBe(20);
      expect(recipient.tmCoinBalance).toBe(10);
      expect(sender.balance).toBe(500);
    });

    it('создает кошелек получателя, если его нет', async () => {
      stubSession();
      const sender = walletDoc({ balance: 100 });
      stubWalletInSession(sender, null);
      Wallet.mockImplementation(function (fields) {
        Object.assign(this, fields);
        this.balance = 0;
        this.tmCoinBalance = 0;
        this.save = jest.fn().mockResolvedValue(this);
      });

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount: 40 }), mockRes());

      expect(Wallet).toHaveBeenCalledWith({ userId: 'user-2' });
    });

    it('запрещает перевод самому себе и откатывает сессию', async () => {
      const session = stubSession();
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-1', amount: 10 }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Нельзя перевести средства самому себе' });
      expect(session.abortTransaction).toHaveBeenCalled();
      expect(Wallet.findOne).not.toHaveBeenCalled();
    });

    it.each([
      ['нулевой суммы', 0],
      ['отрицательной суммы', -1],
      ['нечисловой суммы', 'abc']
    ])('возвращает 400 для %s', async (_label, amount) => {
      const session = stubSession();
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Сумма перевода должна быть больше 0' });
      expect(session.abortTransaction).toHaveBeenCalled();
    });

    it('возвращает 400 при недостатке средств', async () => {
      const session = stubSession();
      stubWalletInSession(walletDoc({ balance: 5 }));
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount: 100 }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Недостаточно средств на балансе' });
      expect(session.abortTransaction).toHaveBeenCalled();
      expect(session.commitTransaction).not.toHaveBeenCalled();
    });

    it('возвращает 400, если кошелька отправителя нет', async () => {
      stubSession();
      stubWalletInSession(null);
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount: 100 }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Недостаточно средств на балансе' });
    });

    it('откатывает транзакцию и возвращает 500 при ошибке сохранения', async () => {
      const session = stubSession();
      const sender = walletDoc({ balance: 500, save: jest.fn().mockRejectedValue(new Error('write failed')) });
      stubWalletInSession(sender, walletDoc({}));
      const res = mockRes();

      await paymentController.transfer(transferReq({ recipientId: 'user-2', amount: 100 }), res);

      expect(session.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'write failed' });
    });
  });

  describe('deposit', () => {
    it('пополняет существующий кошелек и создает транзакцию', async () => {
      const wallet = walletDoc({ balance: 10 });
      Wallet.findOne.mockResolvedValue(wallet);
      Transaction.create.mockResolvedValue({ _id: 'tx-1' });
      const res = mockRes();

      await paymentController.deposit(mockReq({ user: { _id: 'user-1' }, body: { amount: 90 } }), res);

      expect(wallet.balance).toBe(100);
      expect(wallet.save).toHaveBeenCalled();
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ sender: null, recipient: 'user-1', amount: 90, type: 'deposit', currency: 'TMT' })
      );
      expect(res.body).toMatchObject({ message: 'Баланс успешно пополнен' });
    });

    it('пополняет баланс TM_COIN', async () => {
      const wallet = walletDoc({ tmCoinBalance: 5 });
      Wallet.findOne.mockResolvedValue(wallet);
      Transaction.create.mockResolvedValue({});

      await paymentController.deposit(
        mockReq({ user: { _id: 'user-1' }, body: { amount: 5, currency: 'TM_COIN' } }),
        mockRes()
      );

      expect(wallet.tmCoinBalance).toBe(10);
      expect(wallet.balance).toBe(0);
    });

    it('создает кошелек при первом пополнении', async () => {
      Wallet.findOne.mockResolvedValue(null);
      Wallet.mockImplementation(function (fields) {
        Object.assign(this, fields);
        this.balance = 0;
        this.tmCoinBalance = 0;
        this.save = jest.fn().mockResolvedValue(this);
      });
      Transaction.create.mockResolvedValue({});
      const res = mockRes();

      await paymentController.deposit(mockReq({ user: { _id: 'user-1' }, body: { amount: 25 } }), res);

      expect(Wallet).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(res.body.wallet.balance).toBe(25);
    });

    it.each([
      ['нулевой суммы', 0],
      ['отрицательной суммы', -10],
      ['нечисловой суммы', 'abc']
    ])('возвращает 400 для %s', async (_label, amount) => {
      const res = mockRes();

      await paymentController.deposit(mockReq({ user: { _id: 'user-1' }, body: { amount } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Сумма пополнения должна быть больше 0' });
      expect(Wallet.findOne).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке базы', async () => {
      Wallet.findOne.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await paymentController.deposit(mockReq({ user: { _id: 'user-1' }, body: { amount: 10 } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });
  });

  describe('getMyTransactions', () => {
    const stubQuery = (result) => {
      const chain = {
        populate: jest.fn(() => chain),
        skip: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        sort: jest.fn(() => Promise.resolve(result))
      };
      Transaction.find.mockReturnValue(chain);
      return chain;
    };

    it('использует пагинацию по умолчанию (страница 1, лимит 20)', async () => {
      const chain = stubQuery([{ _id: 'tx-1' }]);
      Transaction.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await paymentController.getMyTransactions(mockReq({ user: { _id: 'user-1' } }), res);

      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(res.body).toEqual({ transactions: [{ _id: 'tx-1' }], total: 1, page: 1, pages: 1 });
    });

    it('учитывает query-параметры page и limit', async () => {
      const chain = stubQuery([]);
      Transaction.countDocuments.mockResolvedValue(45);
      const res = mockRes();

      await paymentController.getMyTransactions(
        mockReq({ user: { _id: 'user-1' }, query: { page: '3', limit: '10' } }),
        res
      );

      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(res.body).toMatchObject({ total: 45, page: 3, pages: 5 });
    });

    it('ищет транзакции, где пользователь отправитель или получатель', async () => {
      stubQuery([]);
      Transaction.countDocuments.mockResolvedValue(0);

      await paymentController.getMyTransactions(mockReq({ user: { _id: 'user-1' } }), mockRes());

      expect(Transaction.find).toHaveBeenCalledWith({
        $or: [{ sender: 'user-1' }, { recipient: 'user-1' }]
      });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Transaction.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await paymentController.getMyTransactions(mockReq({ user: { _id: 'user-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });
  });
});
