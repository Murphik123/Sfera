const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните email и пароль' 
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }

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
        console.error('Ошибка логина:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
};

exports.register = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Заполните email и пароль' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            email: normalizedEmail,
            password: hashedPassword,
            username: username || normalizedEmail.split('@')[0]
        });

        await newUser.save();

        return res.status(201).json({ success: true, message: 'Успешная регистрация' });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        return res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации' });
    }
};
