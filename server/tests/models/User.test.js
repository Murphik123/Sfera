const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../../src/models/User');

// Тесты работают с документами без подключения к MongoDB: validateSync и хуки схемы
const validFields = () => ({ username: 'roman', email: 'Roman@Example.COM', password: 'secret1' });

describe('models/User', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('валидация', () => {
    it('валидный пользователь проходит проверку и получает роль user по умолчанию', () => {
      const user = new User(validFields());

      expect(user.validateSync()).toBeUndefined();
      expect(user.role).toBe('user');
      expect(user.online).toBe(false);
      expect(user.isBlocked).toBe(false);
      expect(user.avatar).toBe('');
    });

    it('приводит email к нижнему регистру и обрезает пробелы в username', () => {
      const user = new User({ ...validFields(), username: '  roman  ' });

      expect(user.email).toBe('roman@example.com');
      expect(user.username).toBe('roman');
    });

    it.each(['username', 'email', 'password'])('требует поле %s', (field) => {
      const fields = validFields();
      delete fields[field];

      const errors = new User(fields).validateSync().errors;

      expect(errors[field]).toBeDefined();
    });

    it('отклоняет username короче 3 символов', () => {
      const errors = new User({ ...validFields(), username: 'ab' }).validateSync().errors;

      expect(errors.username.message).toMatch('от 3 символов');
    });

    it('отклоняет username длиннее 30 символов', () => {
      const errors = new User({ ...validFields(), username: 'a'.repeat(31) }).validateSync().errors;

      expect(errors.username.message).toMatch('не должно превышать 30');
    });

    it.each(['broken', 'broken@', 'broken@example'])('отклоняет некорректный email %s', (email) => {
      const errors = new User({ ...validFields(), email }).validateSync().errors;

      expect(errors.email.message).toMatch('корректный email');
    });

    it('отклоняет пароль короче 6 символов', () => {
      const errors = new User({ ...validFields(), password: '12345' }).validateSync().errors;

      expect(errors.password.message).toMatch('не менее 6 символов');
    });

    it('разрешает только роли user, admin и moderator', () => {
      expect(new User({ ...validFields(), role: 'moderator' }).validateSync()).toBeUndefined();
      expect(new User({ ...validFields(), role: 'root' }).validateSync().errors.role).toBeDefined();
    });
  });

  describe('comparePassword', () => {
    it('возвращает true для верного пароля', async () => {
      const user = new User({ ...validFields(), password: await bcrypt.hash('secret1', 10) });

      await expect(user.comparePassword('secret1')).resolves.toBe(true);
    });

    it('возвращает false для неверного пароля', async () => {
      const user = new User({ ...validFields(), password: await bcrypt.hash('secret1', 10) });

      await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
    });
  });

  describe('хэширование пароля перед сохранением', () => {
    // pre('save') вызываем напрямую, чтобы не поднимать MongoDB
    const hashHook = User.schema.s.hooks._pres
      .get('save')
      .find((hook) => hook.fn.toString().includes("isModified('password')")).fn;

    const runPreSave = (user) =>
      new Promise((resolve, reject) => {
        hashHook.call(user, (err) => (err ? reject(err) : resolve()));
      });

    it('заменяет пароль на bcrypt-хэш', async () => {
      const user = new User(validFields());

      await runPreSave(user);

      expect(user.password).not.toBe('secret1');
      await expect(bcrypt.compare('secret1', user.password)).resolves.toBe(true);
    });

    it('не хэширует пароль повторно, если он не менялся', async () => {
      const user = new User(validFields());
      await runPreSave(user);
      const hash = user.password;
      jest.spyOn(user, 'isModified').mockReturnValue(false);

      await runPreSave(user);

      expect(user.password).toBe(hash);
    });
  });
});
