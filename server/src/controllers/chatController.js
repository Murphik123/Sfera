// src/controllers/chatController.js
const Message = require('../models/Message');

const asyncHandler = require('../utils/asyncHandler');
const { ApiError, assertFound } = require('../utils/apiError');
const { emitToUsers } = require('../utils/realtime');

/**
 * Сообщение с раскрытыми участниками переписки.
 */
const populateParticipants = (query, select = 'username avatar online') =>
    query.populate('from', select).populate('to', select);

// ============================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================
exports.sendMessage = asyncHandler(async (req, res) => {
    const { to, text, attachments } = req.body;
    const from = req.userId;

    if (!to || (!text && (!attachments || attachments.length === 0))) {
        throw ApiError.badRequest('Укажите получателя и текст/файлы сообщения');
    }

    const message = new Message({ from, to, text, attachments });
    await message.save();

    const populatedMessage = await populateParticipants(Message.findById(message._id));

    // Оповещение через WebSocket
    emitToUsers(req.app.get('io'), [to, from], 'new_message', populatedMessage);

    res.status(201).json(populatedMessage);
}, { message: 'Ошибка при отправке сообщения' });

// ============================================================
// ПОЛУЧЕНИЕ ПЕРЕПИСКИ С ПОЛЬЗОВАТЕЛЕМ
// ============================================================
exports.getMessages = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const messages = await populateParticipants(
        Message.find({
            $or: [
                { from: req.userId, to: userId },
                { from: userId, to: req.userId }
            ]
        }),
        'username avatar'
    ).sort({ createdAt: 1 });

    res.json(messages);
}, { message: 'Ошибка при получении сообщений' });

// ============================================================
// СПИСОК ДИАЛОГОВ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
exports.getDialogs = asyncHandler(async (req, res) => {
    const currentUserId = req.userId;

    // Находим все сообщения, где текущий пользователь — отправитель или получатель
    const messages = await populateParticipants(
        Message.find({
            $or: [{ from: currentUserId }, { to: currentUserId }]
        })
    ).sort({ createdAt: -1 });

    const dialogsMap = new Map();

    messages.forEach((msg) => {
        const isFromMe = msg.from._id.toString() === currentUserId.toString();
        const partner = isFromMe ? msg.to : msg.from;
        const partnerId = partner._id.toString();

        if (!dialogsMap.has(partnerId)) {
            dialogsMap.set(partnerId, {
                id: partnerId,
                user: partner,
                lastMessage: msg.text,
                time: msg.createdAt,
                unread: !isFromMe && !msg.read ? 1 : 0
            });
        } else if (!isFromMe && !msg.read) {
            dialogsMap.get(partnerId).unread += 1;
        }
    });

    res.json(Array.from(dialogsMap.values()));
}, { message: 'Ошибка при получении списка диалогов' });

// ============================================================
// ОТМЕТКА СООБЩЕНИЯ КАК ПРОЧИТАННОГО
// ============================================================
exports.markAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const message = assertFound(await Message.findById(messageId), 'Сообщение не найдено');

    if (message.to.toString() !== req.userId.toString()) {
        throw ApiError.forbidden('Нет прав для выполнения операции');
    }

    message.read = true;
    await message.save();
    res.json({ message: 'Сообщение отмечено как прочитанное' });
}, { message: 'Ошибка при обновлении статуса' });
