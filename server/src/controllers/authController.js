const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcrypt');
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
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    // Сохраняем сессию в Redis
    await redisClient.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7); // 7 дней

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
    res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await redisClient.del(`session:${req.userId}`);
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
