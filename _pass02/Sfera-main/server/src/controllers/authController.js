// src/controllers/authController.js
const User = require('../models/User');
const Account = require('../models/Account');
const { generateToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        console.log('📝 Registration attempt:', { username, email, role });

        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Укажите логин, email и пароль'
            });
        }

        const existing = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        });

        if (existing) {
            return res.status(400).json({
                message: 'Пользователь с таким email или логином уже существует'
            });
        }

        // Создание пользователя (пароль передаем в чистом виде — User.js захэширует его сам)
        const user = new User({
            username,
            email: email.toLowerCase(),
            password, 
            role: role === 'admin' ? 'admin' : 'user'
        });

        await user.save();
        console.log('✅ User created:', { id: user._id, username: user.username, role: user.role });

        // Автоматическое создание банковского/финансового счёта
        try {
            const account = new Account({ userId: user._id });
            await account.save();
            console.log('✅ Account created for user:', user._id);
        } catch (accountError) {
            console.log('⚠️ Account creation skipped:', accountError.message);
        }

        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ message: 'Ошибка при регистрации', error: error.message });
    }
};

// ============================================================
// ЛОГИН
// ============================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('📥 Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({
                message: 'Укажите email и пароль'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Аккаунт заблокирован' });
        }

        // Проверка пароля через метод модели User.js
        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const token = generateToken(user._id);

        // Сохранение сессии в Redis / RedisMock
        try {
            await redisClient.set(`session:${user._id}`, token);
            console.log('✅ Redis session saved');
        } catch (redisError) {
            console.log('⚠️ Redis session save skipped:', redisError.message);
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
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Ошибка при входе', error: error.message });
    }
};

// ============================================================
// ВЫХОД
// ============================================================
exports.logout = async (req, res) => {
    try {
        const userId = req.userId;
        if (userId) {
            await redisClient.del(`session:${userId}`);
        }
        res.json({ message: 'Успешный выход из системы' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при выходе', error: error.message });
    }
};

// ============================================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (/me)
// ============================================================
exports.getMe = async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                avatar: req.user.avatar || ''
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении профиля', error: error.message });
    }
};
