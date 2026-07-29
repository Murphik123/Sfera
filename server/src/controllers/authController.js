const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, email, passwordHash: hash });
    await user.save();

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

    // Ищем пользователя и по email, и по имени
    const user = await User.findOne({
      $or: [
        { email: inputVal.toLowerCase() },
        { username: inputVal }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash || user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // Возвращаем строго JSON без обращения к Redis
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
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: 'Logged out' });
};
