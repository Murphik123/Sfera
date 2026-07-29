const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs'); // Заменено на bcryptjs для стабильности на Render
const { generateToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Проверка существования по email или username
    const existing = await User.findOne({ 
      $or: [{ email: normalizedEmail }, { username: username.trim() }] 
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Пользователь с таким email или именем уже существует' });
    }

    // Хеширование пароля
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ 
      username: username.trim(), 
      email: normalizedEmail, 
      passwordHash: hash 
    });
    await user.save();

    // Безопасное создание счета
    try {
      if (Account) {
        const account = new Account({ userId: user._id });
        await account.save();
      }
    } catch (accError) {
      console.warn('Предупреждение: Не удалось создать счет:', accError.message);
    }

    return res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return res.status(500).json({ message: error.message || 'Ошибка сервера при регистрации' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // email может содержать и имя пользователя

    if (!email || !password) {
      return res.status(400).json({ message: 'Укажите email/логин и пароль' });
    }

    const inputVal = email.trim();

    // Поиск пользователя как по email, так и по username
    const user = await User.findOne({
      $or: [
        { email: inputVal.toLowerCase() },
        { username: inputVal }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Неверный email/логин или пароль' });
    }

    // Проверка пароля по полю passwordHash
    const match = await bcrypt.compare(password, user.passwordHash || user.password);
    if (!match) {
      return res.status(401).json({ message: 'Неверный email/логин или пароль' });
    }

    const token = generateToken(user._id);

    // Безопасная запись сессии в Redis (не ломает вход, если Redis выключен)
    try {
      if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
      }
    } catch (redisError) {
      console.warn('Redis недоступен, сессия пропущена:', redisError.message);
    }

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    return res.status(500).json({ message: error.message || 'Внутренняя ошибка сервера' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (redisClient && typeof redisClient.del === 'function') {
      await redisClient.del(`session:${req.userId}`);
    }
    return res.json({ message: 'Успешный выход' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
