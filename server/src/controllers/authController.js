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
            console.log('❌ Missing fields:', { username, email, password: !!password });
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
            password: hash,
            role: role === 'admin' ? 'admin' : 'user'
        });

        await user.save();
        console.log('✅ User created:', { id: user._id, username: user.username, role: user.role });

        // Создание счёта (если модель Account существует)
        try {
            const account = new Account({
                userId: user._id,
                balance: 0,
                currency: 'TMN'
            });
            await account.save();
            console.log('✅ Account created for user:', user._id);
        } catch (accountError) {
            console.log('⚠️ Account creation skipped (model may not exist):', accountError.message);
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
        res.status(500).json({
            error: error.message,
            message: 'Registration failed. Please try again.'
        });
    }
};

// ============================================================
// ЛОГИН
// ============================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('📥 Login attempt:', email);

        // Проверка обязательных полей
        if (!email || !password) {
            console.log('❌ Missing credentials');
            return res.status(400).json({
                message: 'Please provide email and password'
            });
        }

        // Поиск пользователя
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Генерация токена
        const token = generateToken(user._id);

        console.log('✅ Login successful for:', email);

        // Сохранение сессии в Redis (если Redis доступен)
        try {
            await redisClient.set(
                `session:${user._id}`,
                token,
                'EX',
                60 * 60 * 24 * 7 // 7 дней
            );
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
        res.status(500).json({
            error: error.message,
            message: 'Login failed. Please try again.'
        });
    }
};

// ============================================================
// ВЫХОД
// ============================================================
exports.logout = async (req, res) => {
    try {
        const userId = req.userId;

        console.log('📤 Logout attempt:', userId);

        // Удаление сессии из Redis
        try {
            await redisClient.del(`session:${userId}`);
            console.log('✅ Redis session deleted');
        } catch (redisError) {
            console.log('⚠️ Redis session delete skipped:', redisError.message);
        }

        res.json({
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Logout failed. Please try again.'
        });
    }
};

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;

        console.log('👤 Get current user:', userId);

        const user = await User.findById(userId).select('-password');

        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                avatar: user.avatar || '',
                online: user.online || false,
                lastSeen: user.lastSeen || null,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to get user data'
        });
    }
};

// ============================================================
// ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
exports.updateUser = async (req, res) => {
    try {
        const userId = req.userId;
        const { username, avatar } = req.body;

        console.log('📝 Update user:', userId);

        const updates = {};
        if (username) updates.username = username;
        if (avatar) updates.avatar = avatar;
        updates.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            console.log('❌ User not found for update:', userId);
            return res.status(404).json({
                message: 'User not found'
            });
        }

        console.log('✅ User updated:', userId);

        res.json({
            message: 'User updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || 'user',
                avatar: user.avatar || ''
            }
        });

    } catch (error) {
        console.error('❌ Update user error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to update user'
        });
    }
};
