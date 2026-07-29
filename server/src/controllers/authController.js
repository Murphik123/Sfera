const User = require('../models/User');
const bcrypt = require('bcrypt'); // ← заменили bcryptjs на bcrypt
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role: role || 'user' });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    // Если Redis недоступен, просто логируем, но не прерываем
    try {
      await redisClient.set(`session:${user._id}`, token, 'EX', 7 * 24 * 60 * 60);
    } catch (redisErr) {
      console.error('Redis error:', redisErr);
    }
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role || 'user' } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await redisClient.del(`session:${req.userId}`);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
