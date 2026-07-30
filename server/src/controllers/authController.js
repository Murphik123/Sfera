const User = require('../models/User');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const redisClient = require('../config/redis');

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        console.log('📝 Registration attempt:', { username, email, role });

        // Проверка обязательных полей
        if (!username || !email || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({
                message: 'Please provide username, email and password'
            });
        }

        // Проверка существования пользователя
        const existing = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        });

        if (existing) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({
                message: 'User with this email or username already exists'
            });
        }

        // Хеширование пароля
        const hash = await bcrypt.hash(password, 10);

        // Создание пользователя
        const user = new User({
            username,
            email: email.toLowerCase(),
            password: hash, // ← поле password
            role: role === 'admin' ? 'admin' : 'user'
        });

        await user.save();
        console.log('✅ User created:', { id: user._id, username: user.username, role: user.role });

        // Создание счёта (если модель Account существует)
        try {
            const account = new Account({ userId: user._id });
            await account.save();
            console.log('✅ Account created for user:', user._id);
        } catch (accountError) {
            console.log('⚠️ Account creation skipped:', accountError.message);
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
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: error.message });
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
            console.log('❌ Missing credentials');
            return res.status(400).json({
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Сравнение пароля с хэшем из поля password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        console.log('✅ Login successful for:', email);

        // Сохранение сессии в Redis
        try {
            await redisClient.set(`session:${user._id}`, token, 'EX', 60 * 60 * 24 * 7);
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
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// ВЫХОД
// ============================================================
exports.logout = async (req, res) => {
    try {
        const userId = req.userId;
        await redisClient.del(`session:${userId}`);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
