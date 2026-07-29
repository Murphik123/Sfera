const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

// Регистрация
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'   // по умолчанию обычный пользователь
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Вход
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },  // используем userId для совместимости с authMiddleware
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Сохраняем сессию в Redis
    await redisClient.set(`session:${user._id}`, token, 'EX', 7 * 24 * 60 * 60);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
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
    res.status(500).json({ message: err.message });
  }
};

// Получить текущего пользователя
exports.getMe = async (req, res) => {
  // req.user уже установлен authMiddleware
  res.json(req.user);
};
