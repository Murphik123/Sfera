const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../../src/utils/jwt');

const SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('utils/jwt', () => {
  describe('generateToken', () => {
    it('создает токен с userId в payload', () => {
      const token = generateToken('user-1');
      const decoded = jwt.verify(token, SECRET);
      expect(decoded.userId).toBe('user-1');
    });

    it('устанавливает срок действия 7 дней', () => {
      const decoded = jwt.decode(generateToken('user-1'));
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('verifyToken', () => {
    it('возвращает payload для валидного токена', () => {
      expect(verifyToken(generateToken('user-42'))).toMatchObject({ userId: 'user-42' });
    });

    it('возвращает null для токена, подписанного другим секретом', () => {
      const foreign = jwt.sign({ userId: 'user-1' }, 'another-secret');
      expect(verifyToken(foreign)).toBeNull();
    });

    it('возвращает null для просроченного токена', () => {
      const expired = jwt.sign({ userId: 'user-1' }, SECRET, { expiresIn: -10 });
      expect(verifyToken(expired)).toBeNull();
    });

    it('возвращает null для мусорных значений вместо токена', () => {
      expect(verifyToken('not-a-token')).toBeNull();
      expect(verifyToken(undefined)).toBeNull();
    });
  });
});
