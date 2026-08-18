const client = require('../../src/config/redis');

describe('config/redis (in-memory RedisMock)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    client.store.clear();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('строковые ключи', () => {
    it('возвращает null для отсутствующего ключа', async () => {
      await expect(client.get('missing')).resolves.toBeNull();
    });

    it('сохраняет и читает значение', async () => {
      await expect(client.set('session:1', 'token')).resolves.toBe('OK');
      await expect(client.get('session:1')).resolves.toBe('token');
    });

    it('перезаписывает значение существующего ключа', async () => {
      await client.set('session:1', 'first');
      await client.set('session:1', 'second');
      await expect(client.get('session:1')).resolves.toBe('second');
    });

    it('удаляет ключ', async () => {
      await client.set('session:1', 'token');
      await expect(client.del('session:1')).resolves.toBe(1);
      await expect(client.get('session:1')).resolves.toBeNull();
    });
  });

  describe('множества', () => {
    it('добавляет элементы и считает размер без дублей', async () => {
      await client.sadd('online', 'a');
      await client.sadd('online', 'a');
      await client.sadd('online', 'b');

      await expect(client.scard('online')).resolves.toBe(2);
      await expect(client.smembers('online')).resolves.toEqual(['a', 'b']);
    });

    it('удаляет элемент из множества', async () => {
      await client.sadd('online', 'a');
      await expect(client.srem('online', 'a')).resolves.toBe(1);
      await expect(client.scard('online')).resolves.toBe(0);
    });

    it('не падает при операциях с несуществующим множеством', async () => {
      await expect(client.srem('nope', 'a')).resolves.toBe(1);
      await expect(client.scard('nope')).resolves.toBe(0);
      await expect(client.smembers('nope')).resolves.toEqual([]);
    });
  });

  describe('совместимость с интерфейсом redis-клиента', () => {
    it('вызывает колбэк события connect', () => {
      jest.useFakeTimers();
      const onConnect = jest.fn();

      expect(client.on('connect', onConnect)).toBe(client);
      jest.advanceTimersByTime(10);

      expect(onConnect).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('игнорирует подписку на error', () => {
      const onError = jest.fn();
      client.on('error', onError);
      expect(onError).not.toHaveBeenCalled();
    });

    it('connect возвращает клиент, quit резолвится', async () => {
      expect(client.connect()).toBe(client);
      await expect(client.quit()).resolves.toBe('OK');
    });
  });
});
