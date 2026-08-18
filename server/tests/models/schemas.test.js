const mongoose = require('mongoose');
const Account = require('../../src/models/Account');
const Wallet = require('../../src/models/Wallet');
const Transaction = require('../../src/models/Transaction');
const Listing = require('../../src/models/Listing');
const Order = require('../../src/models/Order');
const Message = require('../../src/models/Message');
const Mail = require('../../src/models/Mail');
const Prediction = require('../../src/models/Prediction');

const oid = () => new mongoose.Types.ObjectId();

describe('models: схемы и значения по умолчанию', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Account', () => {
    it('создает счет с нулевым балансом в TMT', () => {
      const account = new Account({ userId: oid() });

      expect(account.validateSync()).toBeUndefined();
      expect(account.balance).toBe(0);
      expect(account.currency).toBe('TMT');
    });

    it('требует userId', () => {
      expect(new Account({}).validateSync().errors.userId).toBeDefined();
    });

    it('запрещает отрицательный баланс', () => {
      const errors = new Account({ userId: oid(), balance: -1 }).validateSync().errors;

      expect(errors.balance.message).toMatch('не может быть отрицательным');
    });
  });

  describe('Wallet', () => {
    it('инициализирует все балансы нулями и активен по умолчанию', () => {
      const wallet = new Wallet({ userId: oid() });

      expect(wallet.validateSync()).toBeUndefined();
      expect(wallet.balance).toBe(0);
      expect(wallet.frozenBalance).toBe(0);
      expect(wallet.tmCoinBalance).toBe(0);
      expect(wallet.isActive).toBe(true);
    });

    it.each(['balance', 'frozenBalance', 'tmCoinBalance'])('запрещает отрицательное значение %s', (field) => {
      const errors = new Wallet({ userId: oid(), [field]: -5 }).validateSync().errors;

      expect(errors[field]).toBeDefined();
    });
  });

  describe('Transaction', () => {
    const base = () => ({ amount: 10, type: 'transfer' });

    it('по умолчанию создается в статусе pending в валюте TMT', () => {
      const tx = new Transaction(base());

      expect(tx.validateSync()).toBeUndefined();
      expect(tx.status).toBe('pending');
      expect(tx.currency).toBe('TMT');
      expect(tx.sender).toBeNull();
      expect(tx.recipient).toBeNull();
    });

    it('требует сумму и тип', () => {
      const errors = new Transaction({}).validateSync().errors;

      expect(errors.amount).toBeDefined();
      expect(errors.type).toBeDefined();
    });

    it('запрещает сумму меньше 0.01', () => {
      const errors = new Transaction({ ...base(), amount: 0 }).validateSync().errors;

      expect(errors.amount.message).toMatch('должна быть больше 0');
    });

    it('ограничивает набор типов и статусов', () => {
      expect(new Transaction({ ...base(), type: 'gift' }).validateSync().errors.type).toBeDefined();
      expect(new Transaction({ ...base(), status: 'unknown' }).validateSync().errors.status).toBeDefined();
      expect(new Transaction({ ...base(), currency: 'BTC' }).validateSync().errors.currency).toBeDefined();
    });
  });

  describe('Listing', () => {
    const base = () => ({ seller: oid(), title: 'Авто', price: 100 });

    it('активно, в TMT и в категории other по умолчанию', () => {
      const listing = new Listing(base());

      expect(listing.validateSync()).toBeUndefined();
      expect(listing.status).toBe('active');
      expect(listing.currency).toBe('TMT');
      expect(listing.category).toBe('other');
      expect(listing.viewsCount).toBe(0);
    });

    it('требует продавца, название и цену', () => {
      const errors = new Listing({}).validateSync().errors;

      expect(errors.seller).toBeDefined();
      expect(errors.title).toBeDefined();
      expect(errors.price).toBeDefined();
    });

    it('запрещает отрицательную цену и слишком длинное название', () => {
      expect(new Listing({ ...base(), price: -1 }).validateSync().errors.price).toBeDefined();
      expect(
        new Listing({ ...base(), title: 'a'.repeat(121) }).validateSync().errors.title
      ).toBeDefined();
    });

    it('требует url у каждого изображения', () => {
      const errors = new Listing({ ...base(), images: [{ public_id: 'x' }] }).validateSync().errors;

      expect(errors['images.0.url']).toBeDefined();
    });
  });

  describe('Order', () => {
    const base = () => ({ listing: oid(), buyer: oid(), seller: oid(), amount: 50 });

    it('создается в статусе pending с датами', () => {
      const order = new Order(base());

      expect(order.validateSync()).toBeUndefined();
      expect(order.status).toBe('pending');
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('требует объявление, покупателя, продавца и сумму', () => {
      const errors = new Order({}).validateSync().errors;

      expect(Object.keys(errors).sort()).toEqual(['amount', 'buyer', 'listing', 'seller']);
    });

    it('обновляет updatedAt в pre-save хуке', () => {
      const order = new Order({ ...base(), updatedAt: new Date('2020-01-01') });
      const hook = Order.schema.s.hooks._pres
        .get('save')
        .find((h) => h.fn.toString().includes('updatedAt')).fn;

      hook.call(order, () => {});

      expect(order.updatedAt.getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
    });
  });

  describe('Message', () => {
    it('непрочитано по умолчанию', () => {
      const message = new Message({ from: oid(), to: oid(), text: '  привет  ' });

      expect(message.validateSync()).toBeUndefined();
      expect(message.read).toBe(false);
      expect(message.text).toBe('привет');
    });

    it('требует отправителя, получателя и текст', () => {
      const errors = new Message({}).validateSync().errors;

      expect(errors.from).toBeDefined();
      expect(errors.to).toBeDefined();
      expect(errors.text).toBeDefined();
    });
  });

  describe('Mail', () => {
    it('требует тему и тело письма', () => {
      const errors = new Mail({ from: oid(), to: oid() }).validateSync().errors;

      expect(errors.subject).toBeDefined();
      expect(errors.body).toBeDefined();
    });

    it('непрочитано по умолчанию', () => {
      const mail = new Mail({ from: oid(), to: oid(), subject: 'Тема', body: 'Текст' });

      expect(mail.validateSync()).toBeUndefined();
      expect(mail.read).toBe(false);
    });
  });

  describe('Prediction', () => {
    it('требует прогнозируемую цену и имеет уверенность 0.5 по умолчанию', () => {
      expect(new Prediction({}).validateSync().errors.predictedPrice).toBeDefined();

      const prediction = new Prediction({ predictedPrice: 12 });
      expect(prediction.validateSync()).toBeUndefined();
      expect(prediction.confidence).toBe(0.5);
    });

    it('ограничивает confidence диапазоном 0..1', () => {
      expect(new Prediction({ predictedPrice: 1, confidence: 1.5 }).validateSync().errors.confidence).toBeDefined();
      expect(new Prediction({ predictedPrice: 1, confidence: -0.1 }).validateSync().errors.confidence).toBeDefined();
    });
  });
});
