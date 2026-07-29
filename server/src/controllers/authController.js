const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

// Регистрация
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все обязательные поля' });
        }

        // Проверка существования пользователя
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь с таким Email или Именем уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        await user.save();
        res.status(201).json({ message: 'Регистрация прошла успешно' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: err.message || 'Ошибка сервера при регистрации' });
    }
};

// Вход
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Введите Email и пароль' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Неверный e-mail или пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверный e-mail или пароль' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        // Безопасная запись в Redis (v4)
        if (redisClient && redisClient.isReady) {
            try {
                await redisClient.set(`session:${user._id}`, token, { EX: 7 * 24 * 60 * 60 });
            } catch (redisErr) {
                console.error('Redis error (non-critical):', redisErr.message);
            }
        }

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
        res.status(500).json({ message: err.message || 'Ошибка сервера при входе' });
    }
};

// Выход
exports.logout = async (req, res) => {
    try {
        const userId = req.userId;
        if (redisClient && redisClient.isReady) {
            await redisClient.del(`session:${userId}`);
        }
        res.json({ message: 'Успешный выход' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Получить текущего пользователя
exports.getMe = async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ message: err.message });
    }
};
