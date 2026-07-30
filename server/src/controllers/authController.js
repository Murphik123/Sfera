const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка обязательных полей
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide username, email and password' 
      });
    }

    // Проверка существования
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хеширование пароля
    const hash = await bcrypt.hash(password, 10);
    
    // Сохраняем хеш в поле password
    const user = new User({ 
      username, 
      email, 
      password: hash  // ← ИЗМЕНЕНО: было passwordHash, стало password
    });
    await user.save();

    // Создаём счёт для пользователя (если есть модель Account)
    try {
      const account = new Account({ userId: user._id });
      await account.save();
    } catch (err) {
      console.log('Account creation skipped:', err.message);
    }

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Сравниваем с полем password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    
    // Сохраняем сессию в Redis
    try {
      await redisClient.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
    } catch (err) {
      console.log('Redis session save skipped:', err.message);
    }

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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
