const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs'); // bcryptjs не ломает сборку на Linux/Render
const { generateToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка существования
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хеширование пароля
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, email, passwordHash: hash });
    await user.save();

    // Создаём счёт для пользователя
    const account = new Account({ userId: user._id });
    await account.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    const inputVal = email.trim();

    // Ищем и по email, и по username
    const user = await User.findOne({
      $or: [
        { email: inputVal.toLowerCase() },
        { username: inputVal }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Проверяем хеш пароля
    const match = await bcrypt.compare(password, user.passwordHash || user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // Безопасное сохранение в Redis (не ломает ответ, если Redis недоступен)
    try {
      if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
      }
    } catch (redisErr) {
      console.warn('Redis offline, skipping session store:', redisErr.message);
    }

    // Возвращаем точную структуру ответа для твоей фронтенд скрипт-логики
    res.json({
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
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    try {
      if (redisClient && typeof redisClient.del === 'function') {
        await redisClient.del(`session:${req.userId}`);
      }
    } catch (e) {}
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
