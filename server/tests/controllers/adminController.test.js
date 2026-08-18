jest.mock('mongoose', () => ({ Types: { ObjectId: { isValid: jest.fn() } } }));
jest.mock('../../src/models/User', () => ({ find: jest.fn(), findById: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../../src/models/Transaction', () => ({ find: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../../src/models/Listing', () => ({ find: jest.fn(), findById: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../../src/models/Mail', () => ({ find: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../../src/models/Prediction', () => {
  const model = jest.fn();
  model.find = jest.fn();
  model.findByIdAndDelete = jest.fn();
  model.countDocuments = jest.fn();
  return model;
});

const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Transaction = require('../../src/models/Transaction');
const Listing = require('../../src/models/Listing');
const Mail = require('../../src/models/Mail');
const Prediction = require('../../src/models/Prediction');
const adminController = require('../../src/controllers/adminController');
const { mockReq, mockRes } = require('../helpers/http');

// Цепочки вида Model.find().select().skip().limit().sort() / .populate()...
const stubListQuery = (model, result) => {
  const chain = {
    select: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    sort: jest.fn(() => Promise.resolve(result))
  };
  model.find.mockReturnValue(chain);
  return chain;
};

describe('controllers/adminController', () => {
  beforeEach(() => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  describe('getStats', () => {
    it('собирает счетчики по всем коллекциям', async () => {
      User.countDocuments.mockResolvedValue(5);
      Transaction.countDocuments.mockResolvedValue(4);
      Listing.countDocuments.mockResolvedValue(3);
      Mail.countDocuments.mockResolvedValue(2);
      Prediction.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await adminController.getStats(mockReq(), res);

      expect(res.body).toEqual({ users: 5, transactions: 4, listings: 3, mails: 2, predictions: 1 });
    });

    it('возвращает 500, если один из запросов упал', async () => {
      User.countDocuments.mockRejectedValue(new Error('db down'));
      Transaction.countDocuments.mockResolvedValue(0);
      Listing.countDocuments.mockResolvedValue(0);
      Mail.countDocuments.mockResolvedValue(0);
      Prediction.countDocuments.mockResolvedValue(0);
      const res = mockRes();

      await adminController.getStats(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });
  });

  describe('getUsers', () => {
    it('исключает пароль и пагинирует по умолчанию', async () => {
      const chain = stubListQuery(User, [{ _id: 'user-1' }]);
      User.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await adminController.getUsers(mockReq(), res);

      expect(User.find).toHaveBeenCalledWith({});
      expect(chain.select).toHaveBeenCalledWith('-password');
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(res.body).toEqual({ users: [{ _id: 'user-1' }], total: 1, page: 1, pages: 1 });
    });

    it('ищет по username и email', async () => {
      stubListQuery(User, []);
      User.countDocuments.mockResolvedValue(0);

      await adminController.getUsers(mockReq({ query: { search: ' roman ' } }), mockRes());

      expect(User.find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'roman', $options: 'i' } },
          { email: { $regex: 'roman', $options: 'i' } }
        ]
      });
    });

    it('экранирует спецсимволы регулярных выражений в поиске', async () => {
      stubListQuery(User, []);
      User.countDocuments.mockResolvedValue(0);

      await adminController.getUsers(mockReq({ query: { search: 'a.b*c' } }), mockRes());

      expect(User.find).toHaveBeenCalledWith({
        $or: [
          { username: { $regex: 'a\\.b\\*c', $options: 'i' } },
          { email: { $regex: 'a\\.b\\*c', $options: 'i' } }
        ]
      });
    });

    it('возвращает 500 при ошибке базы', async () => {
      User.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getUsers(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });
  });

  describe('getUser', () => {
    it('возвращает пользователя без пароля', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'user-1' }) });
      const res = mockRes();

      await adminController.getUser(mockReq({ params: { id: 'user-1' } }), res);

      expect(res.body).toEqual({ _id: 'user-1' });
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.getUser(mockReq({ params: { id: 'bad' } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Invalid User ID' });
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('возвращает 404, если пользователь не найден', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      const res = mockRes();

      await adminController.getUser(mockReq({ params: { id: 'user-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('возвращает 500 при ошибке базы', async () => {
      User.findById.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getUser(mockReq({ params: { id: 'user-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateUser', () => {
    const userDoc = () => ({
      _id: 'user-1',
      username: 'roman',
      email: 'roman@example.com',
      role: 'user',
      isBlocked: false,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ _id: 'user-1' }))
    });

    it('обновляет только переданные поля', async () => {
      const user = userDoc();
      User.findById.mockResolvedValue(user);
      const res = mockRes();

      await adminController.updateUser(
        mockReq({ params: { id: 'user-1' }, body: { role: 'moderator' } }),
        res
      );

      expect(user.role).toBe('moderator');
      expect(user.username).toBe('roman');
      expect(user.save).toHaveBeenCalled();
      expect(res.body).toEqual({ message: 'User updated', user: { _id: 'user-1' } });
    });

    it('позволяет разблокировать пользователя значением false', async () => {
      const user = userDoc();
      user.isBlocked = true;
      User.findById.mockResolvedValue(user);

      await adminController.updateUser(
        mockReq({ params: { id: 'user-1' }, body: { isBlocked: false } }),
        mockRes()
      );

      expect(user.isBlocked).toBe(false);
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.updateUser(mockReq({ params: { id: 'bad' }, body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('возвращает 404, если пользователя нет', async () => {
      User.findById.mockResolvedValue(null);
      const res = mockRes();

      await adminController.updateUser(mockReq({ params: { id: 'user-1' }, body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('возвращает 500 при ошибке сохранения', async () => {
      const user = userDoc();
      user.save.mockRejectedValue(new Error('validation failed'));
      User.findById.mockResolvedValue(user);
      const res = mockRes();

      await adminController.updateUser(mockReq({ params: { id: 'user-1' }, body: { username: 'x' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'validation failed' });
    });
  });

  describe('deleteUser', () => {
    it('удаляет пользователя', async () => {
      User.findByIdAndDelete.mockResolvedValue({ _id: 'user-1' });
      const res = mockRes();

      await adminController.deleteUser(mockReq({ params: { id: 'user-1' } }), res);

      expect(res.body).toEqual({ message: 'User deleted' });
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.deleteUser(mockReq({ params: { id: 'bad' } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('возвращает 404, если пользователя нет', async () => {
      User.findByIdAndDelete.mockResolvedValue(null);
      const res = mockRes();

      await adminController.deleteUser(mockReq({ params: { id: 'user-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTransactions', () => {
    it('пагинирует список транзакций', async () => {
      const chain = stubListQuery(Transaction, [{ _id: 'tx-1' }]);
      Transaction.countDocuments.mockResolvedValue(21);
      const res = mockRes();

      await adminController.getTransactions(mockReq({ query: { page: '2' } }), res);

      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(res.body).toMatchObject({ total: 21, page: 2, pages: 2 });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Transaction.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getTransactions(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getListings', () => {
    it('фильтрует по статусу, если он передан', async () => {
      stubListQuery(Listing, []);
      Listing.countDocuments.mockResolvedValue(0);

      await adminController.getListings(mockReq({ query: { status: 'sold' } }), mockRes());

      expect(Listing.find).toHaveBeenCalledWith({ status: 'sold' });
      expect(Listing.countDocuments).toHaveBeenCalledWith({ status: 'sold' });
    });

    it('без статуса возвращает все объявления', async () => {
      stubListQuery(Listing, []);
      Listing.countDocuments.mockResolvedValue(0);

      await adminController.getListings(mockReq(), mockRes());

      expect(Listing.find).toHaveBeenCalledWith({});
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getListings(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateListing', () => {
    it('меняет статус объявления', async () => {
      const listing = { _id: 'l-1', status: 'active', save: jest.fn().mockResolvedValue(undefined) };
      Listing.findById.mockResolvedValue(listing);
      const res = mockRes();

      await adminController.updateListing(mockReq({ params: { id: 'l-1' }, body: { status: 'blocked' } }), res);

      expect(listing.status).toBe('blocked');
      expect(res.body).toEqual({ message: 'Listing updated', listing });
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.updateListing(mockReq({ params: { id: 'bad' }, body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Invalid Listing ID' });
    });

    it('возвращает 404, если объявления нет', async () => {
      Listing.findById.mockResolvedValue(null);
      const res = mockRes();

      await adminController.updateListing(mockReq({ params: { id: 'l-1' }, body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteListing', () => {
    it('удаляет объявление', async () => {
      Listing.findByIdAndDelete.mockResolvedValue({ _id: 'l-1' });
      const res = mockRes();

      await adminController.deleteListing(mockReq({ params: { id: 'l-1' } }), res);

      expect(res.body).toEqual({ message: 'Listing deleted' });
    });

    it('возвращает 404, если объявления нет', async () => {
      Listing.findByIdAndDelete.mockResolvedValue(null);
      const res = mockRes();

      await adminController.deleteListing(mockReq({ params: { id: 'l-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.deleteListing(mockReq({ params: { id: 'bad' } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMails', () => {
    it('возвращает письма с пагинацией', async () => {
      const chain = stubListQuery(Mail, [{ _id: 'm-1' }]);
      Mail.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await adminController.getMails(mockReq(), res);

      expect(chain.populate).toHaveBeenCalledWith('from', 'username email');
      expect(chain.populate).toHaveBeenCalledWith('to', 'username email');
      expect(res.body).toMatchObject({ mails: [{ _id: 'm-1' }], total: 1 });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Mail.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getMails(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteMail', () => {
    it('удаляет письмо', async () => {
      Mail.findByIdAndDelete.mockResolvedValue({ _id: 'm-1' });
      const res = mockRes();

      await adminController.deleteMail(mockReq({ params: { id: 'm-1' } }), res);

      expect(res.body).toEqual({ message: 'Mail deleted' });
    });

    it('возвращает 404, если письма нет', async () => {
      Mail.findByIdAndDelete.mockResolvedValue(null);
      const res = mockRes();

      await adminController.deleteMail(mockReq({ params: { id: 'm-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('возвращает 400 для некорректного ObjectId', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.deleteMail(mockReq({ params: { id: 'bad' } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Invalid Mail ID' });
    });
  });

  describe('прогнозы', () => {
    it('возвращает прогнозы с пагинацией', async () => {
      const chain = stubListQuery(Prediction, [{ _id: 'p-1' }]);
      Prediction.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await adminController.getPredictions(mockReq({ query: { limit: '5' } }), res);

      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(res.body).toMatchObject({ predictions: [{ _id: 'p-1' }], total: 1, pages: 1 });
    });

    it('создает прогноз', async () => {
      Prediction.mockImplementation(function (fields) {
        Object.assign(this, fields);
        this.save = jest.fn().mockResolvedValue(this);
      });
      const res = mockRes();

      await adminController.createPrediction(
        mockReq({ body: { coin: 'TM_COIN', predictedPrice: 12, confidence: 0.8, notes: 'рост' } }),
        res
      );

      expect(Prediction).toHaveBeenCalledWith({
        coin: 'TM_COIN',
        predictedPrice: 12,
        confidence: 0.8,
        notes: 'рост'
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('возвращает 500, если прогноз не сохранился', async () => {
      Prediction.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('db down'));
      });
      const res = mockRes();

      await adminController.createPrediction(mockReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'db down' });
    });

    it('удаляет прогноз', async () => {
      Prediction.findByIdAndDelete.mockResolvedValue({ _id: 'p-1' });
      const res = mockRes();

      await adminController.deletePrediction(mockReq({ params: { id: 'p-1' } }), res);

      expect(res.body).toEqual({ message: 'Prediction deleted' });
    });

    it('возвращает 404, если прогноза нет', async () => {
      Prediction.findByIdAndDelete.mockResolvedValue(null);
      const res = mockRes();

      await adminController.deletePrediction(mockReq({ params: { id: 'p-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('возвращает 400 для некорректного ObjectId прогноза', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      const res = mockRes();

      await adminController.deletePrediction(mockReq({ params: { id: 'bad' } }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Invalid Prediction ID' });
    });

    it('возвращает 500 при ошибке чтения прогнозов', async () => {
      Prediction.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await adminController.getPredictions(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
