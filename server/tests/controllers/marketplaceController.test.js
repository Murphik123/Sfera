jest.mock('../../src/models/Listing', () => {
  const model = jest.fn();
  model.find = jest.fn();
  model.findById = jest.fn();
  return model;
});
jest.mock('../../src/models/Order', () => jest.fn());
jest.mock('../../src/config/redis', () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() }));

const Listing = require('../../src/models/Listing');
const Order = require('../../src/models/Order');
const redisClient = require('../../src/config/redis');
const marketplaceController = require('../../src/controllers/marketplaceController');
const { mockReq, mockRes } = require('../helpers/http');

const stubSaveable = (model, impl) => {
  model.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this.save = jest.fn(impl || (() => Promise.resolve(this)));
  });
};

describe('controllers/marketplaceController', () => {
  beforeEach(() => {
    stubSaveable(Listing);
    stubSaveable(Order);
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
  });

  describe('getListings', () => {
    it('возвращает данные из кеша, не обращаясь к базе', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify([{ _id: 'l-1' }]));
      const res = mockRes();

      await marketplaceController.getListings(mockReq(), res);

      expect(redisClient.get).toHaveBeenCalledWith('listings:all');
      expect(Listing.find).not.toHaveBeenCalled();
      expect(res.body).toEqual([{ _id: 'l-1' }]);
    });

    it('читает активные объявления из базы и кеширует их на 5 минут', async () => {
      const listings = [{ _id: 'l-1' }];
      Listing.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(listings) });
      const res = mockRes();

      await marketplaceController.getListings(mockReq(), res);

      expect(Listing.find).toHaveBeenCalledWith({ status: 'active' });
      expect(redisClient.set).toHaveBeenCalledWith('listings:all', JSON.stringify(listings), 'EX', 300);
      expect(res.body).toBe(listings);
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await marketplaceController.getListings(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ error: 'db down' });
    });
  });

  describe('createListing', () => {
    const createReq = () =>
      mockReq({
        userId: 'user-1',
        body: { title: 'Авто', description: 'опис', price: 100, category: 'cars', images: ['a.png'] }
      });

    it('создает объявление и сбрасывает кеш', async () => {
      const res = mockRes();

      await marketplaceController.createListing(createReq(), res);

      expect(Listing).toHaveBeenCalledWith(
        expect.objectContaining({ seller: 'user-1', title: 'Авто', price: 100 })
      );
      expect(redisClient.del).toHaveBeenCalledWith('listings:all');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('возвращает 500 при ошибке сохранения и не сбрасывает кеш', async () => {
      stubSaveable(Listing, () => Promise.reject(new Error('db down')));
      const res = mockRes();

      await marketplaceController.createListing(createReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ error: 'db down' });
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    const orderReq = () => mockReq({ userId: 'buyer-1', body: { listingId: 'l-1' } });
    const activeListing = () => ({
      _id: 'l-1',
      seller: 'seller-1',
      price: 300,
      status: 'active',
      save: jest.fn().mockResolvedValue(undefined)
    });

    it('создает заказ, помечает объявление проданным и сбрасывает кеш', async () => {
      const listing = activeListing();
      Listing.findById.mockResolvedValue(listing);
      const res = mockRes();

      await marketplaceController.createOrder(orderReq(), res);

      expect(Order).toHaveBeenCalledWith({
        listing: 'l-1',
        buyer: 'buyer-1',
        seller: 'seller-1',
        amount: 300
      });
      expect(listing.status).toBe('sold');
      expect(listing.save).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith('listings:all');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('возвращает 404, если объявления нет', async () => {
      Listing.findById.mockResolvedValue(null);
      const res = mockRes();

      await marketplaceController.createOrder(orderReq(), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ message: 'Listing not found' });
      expect(Order).not.toHaveBeenCalled();
    });

    it('возвращает 400, если объявление уже продано', async () => {
      Listing.findById.mockResolvedValue({ ...activeListing(), status: 'sold' });
      const res = mockRes();

      await marketplaceController.createOrder(orderReq(), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Listing not available' });
      expect(Order).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.findById.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await marketplaceController.createOrder(orderReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ error: 'db down' });
    });
  });
});
