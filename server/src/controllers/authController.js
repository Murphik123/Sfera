const User = require('../models/User'); // Путь к модели из src/controllers в src/models
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Регистрация пользователя
exports.register = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Заполните email и пароль' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Проверяем, существует ли уже пользователь
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже зарегистрирован' });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создаем пользователя
        const newUser = new User({
            email: normalizedEmail,
            password: hashedPassword,
            username: username || normalizedEmail.split('@')[0]
        });

        await newUser.save();

        return res.status(201).json({
            success: true,
            message: 'Регистрация прошла успешно'
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        // Возвращаем JSON даже при ошибке сервера, чтобы фронтенд не ломался
        return res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации' });
    }
};

// Вход пользователя
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Укажите email и пароль' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Ищем пользователя
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Неверный email или пароль' });
        }

        // Проверяем пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Неверный email или пароль' });
        }

        // Генерируем токен
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'sfera_secret_key',
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Ошибка при входе:', error);
        return res.status(500).json({ success: false, message: 'Ошибка сервера при входе' });
    }
};
