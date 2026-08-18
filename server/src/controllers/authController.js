// src/controllers/authController.js
const User = require('../models/User');
const Account = require('../models/Account');
const { generateToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { assertRequiredFields } = require('../utils/validation');
const { toPublicUser } = require('../utils/serializers');
const { saveSession, clearSession } = require('../utils/session');

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
exports.register = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    console.log('📝 Registration attempt:', { username, email, role });

    assertRequiredFields(req.body, ['username', 'email', 'password'], 'Укажите логин, email и пароль');

    const existing = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existing) {
        throw ApiError.badRequest('Пользователь с таким email или логином уже существует');
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
        await new Account({ userId: user._id }).save();
        console.log('✅ Account created for user:', user._id);
    } catch (accountError) {
        console.log('⚠️ Account creation skipped:', accountError.message);
    }

    res.status(201).json({
        message: 'Пользователь успешно зарегистрирован',
        token: generateToken(user._id),
        user: toPublicUser(user)
    });
}, { message: 'Ошибка при регистрации', logLabel: '❌ Registration error' });

// ============================================================
// ЛОГИН
// ============================================================
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    console.log('📥 Login attempt:', email);

    assertRequiredFields(req.body, ['email', 'password'], 'Укажите email и пароль');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw ApiError.unauthorized('Неверный email или пароль');
    }

    if (user.isBlocked) {
        throw ApiError.forbidden('Аккаунт заблокирован');
    }

    // Проверка пароля через метод модели User.js
    const match = await user.comparePassword(password);
    if (!match) {
        throw ApiError.unauthorized('Неверный email или пароль');
    }

    const token = generateToken(user._id);
    await saveSession(user._id, token);

    res.json({ token, user: toPublicUser(user) });
}, { message: 'Ошибка при входе', logLabel: '❌ Login error' });

// ============================================================
// ВЫХОД
// ============================================================
exports.logout = asyncHandler(async (req, res) => {
    await clearSession(req.userId);
    res.json({ message: 'Успешный выход из системы' });
}, { message: 'Ошибка при выходе' });

// ============================================================
// ПОЛУЧЕНИЕ ПРОФИЛЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (/me)
// ============================================================
exports.getMe = asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(req.user) });
}, { message: 'Ошибка при получении профиля' });
