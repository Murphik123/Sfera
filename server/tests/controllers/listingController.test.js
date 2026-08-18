jest.mock('../../src/models/Listing', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn()
}));

const Listing = require('../../src/models/Listing');
const listingController = require('../../src/controllers/listingController');
const { mockReq, mockRes } = require('../helpers/http');

// Listing.find(query).populate().sort().skip().limit()
const stubFindQuery = (result) => {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(result))
  };
  Listing.find.mockReturnValue(chain);
  return chain;
};

const stubFindByIdAndUpdate = (result) => {
  Listing.findByIdAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(result) });
};

describe('controllers/listingController', () => {
  describe('getListings', () => {
    it('фильтрует по статусу active и пагинирует по умолчанию', async () => {
      const chain = stubFindQuery([{ _id: 'l-1' }]);
      Listing.countDocuments.mockResolvedValue(1);
      const res = mockRes();

      await listingController.getListings(mockReq(), res);

      expect(Listing.find).toHaveBeenCalledWith({ status: 'active' });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toMatchObject({ success: true, count: 1, total: 1, totalPages: 1, currentPage: 1 });
    });

    it('строит фильтр по категории, цене и текстовому поиску', async () => {
      stubFindQuery([]);
      Listing.countDocuments.mockResolvedValue(0);

      await listingController.getListings(
        mockReq({ query: { category: 'cars', minPrice: '100', maxPrice: '500', search: 'bmw', status: 'sold' } }),
        mockRes()
      );

      expect(Listing.find).toHaveBeenCalledWith({
        status: 'sold',
        category: 'cars',
        price: { $gte: 100, $lte: 500 },
        $text: { $search: 'bmw' }
      });
    });

    it('добавляет только нижнюю границу цены, если задан minPrice', async () => {
      stubFindQuery([]);
      Listing.countDocuments.mockResolvedValue(0);

      await listingController.getListings(mockReq({ query: { minPrice: '50' } }), mockRes());

      expect(Listing.find).toHaveBeenCalledWith({ status: 'active', price: { $gte: 50 } });
    });

    it('считает количество страниц по лимиту', async () => {
      const chain = stubFindQuery([]);
      Listing.countDocuments.mockResolvedValue(25);
      const res = mockRes();

      await listingController.getListings(mockReq({ query: { page: '2', limit: '10' } }), res);

      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(res.body).toMatchObject({ totalPages: 3, currentPage: 2 });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await listingController.getListings(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ success: false, message: 'db down' });
    });
  });

  describe('getListingById', () => {
    it('увеличивает счетчик просмотров и возвращает объявление', async () => {
      stubFindByIdAndUpdate({ _id: 'l-1', viewsCount: 4 });
      const res = mockRes();

      await listingController.getListingById(mockReq({ params: { id: 'l-1' } }), res);

      expect(Listing.findByIdAndUpdate).toHaveBeenCalledWith(
        'l-1',
        { $inc: { viewsCount: 1 } },
        { new: true }
      );
      expect(res.body).toEqual({ success: true, data: { _id: 'l-1', viewsCount: 4 } });
    });

    it('возвращает 404, если объявления нет', async () => {
      stubFindByIdAndUpdate(null);
      const res = mockRes();

      await listingController.getListingById(mockReq({ params: { id: 'l-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ success: false, message: 'Объявление не найдено' });
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await listingController.getListingById(mockReq({ params: { id: 'l-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ success: false, message: 'db down' });
    });
  });

  describe('createListing', () => {
    const createReq = (overrides = {}) =>
      mockReq({
        user: { _id: 'user-1' },
        body: { title: 'Авто', description: 'опис', price: 100, currency: 'TMT', category: 'cars' },
        get: jest.fn(() => 'sfera.tm'),
        protocol: 'http',
        ...overrides
      });

    it('создает объявление от имени текущего пользователя', async () => {
      Listing.create.mockResolvedValue({ _id: 'l-1' });
      const res = mockRes();

      await listingController.createListing(createReq(), res);

      expect(Listing.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Авто', seller: 'user-1', images: [] })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toEqual({ success: true, data: { _id: 'l-1' } });
    });

    it('разбирает location из JSON-строки', async () => {
      Listing.create.mockResolvedValue({});

      await listingController.createListing(
        createReq({
          body: { title: 'Авто', location: '{"city":"Ashgabat"}' }
        }),
        mockRes()
      );

      expect(Listing.create).toHaveBeenCalledWith(
        expect.objectContaining({ location: { city: 'Ashgabat' } })
      );
    });

    it('подставляет пустой location при некорректном JSON', async () => {
      Listing.create.mockResolvedValue({});

      await listingController.createListing(
        createReq({ body: { title: 'Авто', location: '{broken' } }),
        mockRes()
      );

      expect(Listing.create).toHaveBeenCalledWith(expect.objectContaining({ location: {} }));
    });

    it('формирует URL загруженных изображений с учетом x-forwarded-proto', async () => {
      Listing.create.mockResolvedValue({});

      await listingController.createListing(
        createReq({
          headers: { 'x-forwarded-proto': 'https' },
          files: [{ filename: 'listing-1.jpg' }]
        }),
        mockRes()
      );

      expect(Listing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [{ url: 'https://sfera.tm/uploads/listing-1.jpg', public_id: 'listing-1.jpg' }]
        })
      );
    });

    it('возвращает 400 при ошибке валидации', async () => {
      Listing.create.mockRejectedValue(new Error('title required'));
      const res = mockRes();

      await listingController.createListing(createReq(), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ success: false, message: 'title required' });
    });
  });

  describe('updateListing', () => {
    const updateReq = (overrides = {}) =>
      mockReq({
        params: { id: 'l-1' },
        user: { _id: 'user-1', role: 'user' },
        body: { title: 'Новое имя' },
        get: jest.fn(() => 'sfera.tm'),
        protocol: 'http',
        ...overrides
      });

    it('обновляет объявление владельца с валидаторами', async () => {
      Listing.findById.mockResolvedValue({ _id: 'l-1', seller: 'user-1', images: [] });
      Listing.findByIdAndUpdate.mockResolvedValue({ _id: 'l-1', title: 'Новое имя' });
      const res = mockRes();

      await listingController.updateListing(updateReq(), res);

      expect(Listing.findByIdAndUpdate).toHaveBeenCalledWith(
        'l-1',
        { title: 'Новое имя' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toEqual({ success: true, data: { _id: 'l-1', title: 'Новое имя' } });
    });

    it('позволяет администратору редактировать чужое объявление', async () => {
      Listing.findById.mockResolvedValue({ seller: 'user-9', images: [] });
      Listing.findByIdAndUpdate.mockResolvedValue({});
      const res = mockRes();

      await listingController.updateListing(updateReq({ user: { _id: 'user-1', role: 'admin' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('добавляет новые изображения к существующим', async () => {
      const existing = { url: 'http://sfera.tm/uploads/old.jpg', public_id: 'old.jpg' };
      Listing.findById.mockResolvedValue({ seller: 'user-1', images: [existing] });
      Listing.findByIdAndUpdate.mockResolvedValue({});

      await listingController.updateListing(
        updateReq({ body: {}, files: [{ filename: 'new.jpg' }] }),
        mockRes()
      );

      expect(Listing.findByIdAndUpdate).toHaveBeenCalledWith(
        'l-1',
        {
          images: [existing, { url: 'http://sfera.tm/uploads/new.jpg', public_id: 'new.jpg' }]
        },
        expect.anything()
      );
    });

    it('возвращает 404, если объявления нет', async () => {
      Listing.findById.mockResolvedValue(null);
      const res = mockRes();

      await listingController.updateListing(updateReq(), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ success: false, message: 'Объявление не найдено' });
    });

    it('возвращает 403 для чужого объявления', async () => {
      Listing.findById.mockResolvedValue({ seller: 'user-9', images: [] });
      const res = mockRes();

      await listingController.updateListing(updateReq(), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body).toEqual({ success: false, message: 'Нет прав на редактирование' });
      expect(Listing.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('возвращает 400 при ошибке обновления', async () => {
      Listing.findById.mockResolvedValue({ seller: 'user-1', images: [] });
      Listing.findByIdAndUpdate.mockRejectedValue(new Error('validation failed'));
      const res = mockRes();

      await listingController.updateListing(updateReq(), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ success: false, message: 'validation failed' });
    });
  });

  describe('deleteListing', () => {
    const deleteReq = (user = { _id: 'user-1', role: 'user' }) =>
      mockReq({ params: { id: 'l-1' }, user });

    it('удаляет объявление владельца', async () => {
      const listing = { seller: 'user-1', deleteOne: jest.fn().mockResolvedValue(undefined) };
      Listing.findById.mockResolvedValue(listing);
      const res = mockRes();

      await listingController.deleteListing(deleteReq(), res);

      expect(listing.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toEqual({ success: true, message: 'Объявление удалено' });
    });

    it('позволяет администратору удалить чужое объявление', async () => {
      const listing = { seller: 'user-9', deleteOne: jest.fn().mockResolvedValue(undefined) };
      Listing.findById.mockResolvedValue(listing);
      const res = mockRes();

      await listingController.deleteListing(deleteReq({ _id: 'user-1', role: 'admin' }), res);

      expect(listing.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('возвращает 404, если объявления нет', async () => {
      Listing.findById.mockResolvedValue(null);
      const res = mockRes();

      await listingController.deleteListing(deleteReq(), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('возвращает 403 для чужого объявления', async () => {
      const listing = { seller: 'user-9', deleteOne: jest.fn() };
      Listing.findById.mockResolvedValue(listing);
      const res = mockRes();

      await listingController.deleteListing(deleteReq(), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(listing.deleteOne).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке базы', async () => {
      Listing.findById.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await listingController.deleteListing(deleteReq(), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ success: false, message: 'db down' });
    });
  });
});
