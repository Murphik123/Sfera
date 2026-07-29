const User = require('../models/User');
const bcrypt = require('bcrypt'); // используем bcrypt (уже установлен)
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

// Регистрация
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    console.log('Register attempt:', { username, email, role });

    // Проверка существования пользователя
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    await user.save();
    console.log('User registered:', user.username);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Вход
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Сохраняем сессию в Redis (если Redis недоступен – просто логируем)
    try {
      await redisClient.set(`session:${user._id}`, token, 'EX', 7 * 24 * 60 * 60);
    } catch (redisErr) {
      console.error('Redis error (non-critical):', redisErr.message);
    }

    console.log('Login successful:', user.username);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Выход
exports.logout = async (req, res) => {
  try {
    const userId = req.userId;
    await redisClient.del(`session:${userId}`);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Получить текущего пользователя (для проверки)
exports.getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: err.message });
  }
};
