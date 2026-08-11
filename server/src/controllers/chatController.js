// src/controllers/chatController.js
const Message = require('../models/Message');
const User = require('../models/User');

// ============================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================
exports.sendMessage = async (req, res) => {
  try {
    const { to, text, attachments } = req.body;
    const from = req.userId;

    if (!to || (!text && (!attachments || attachments.length === 0))) {
      return res.status(400).json({ message: 'Укажите получателя и текст/файлы сообщения' });
    }

    const message = new Message({ from, to, text, attachments });
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('from', 'username avatar online')
      .populate('to', 'username avatar online');

    // Оповещение через WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(to.toString()).emit('new_message', populatedMessage);
      io.to(from.toString()).emit('new_message', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при отправке сообщения', error: error.message });
  }
};

// ============================================================
// ПОЛУЧЕНИЕ ПЕРЕПИСКИ С ПОЛЬЗОВАТЕЛЕМ
// ============================================================
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { from: req.userId, to: userId },
        { from: userId, to: req.userId }
      ]
    })
    .populate('from', 'username avatar')
    .populate('to', 'username avatar')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении сообщений', error: error.message });
  }
};

// ============================================================
// СПИСОК ДИАЛОГОВ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
exports.getDialogs = async (req, res) => {
  try {
    const currentUserId = req.userId;

    // Находим все сообщения, где текущий пользователь — отправитель или получатель
    const messages = await Message.find({
      $or: [{ from: currentUserId }, { to: currentUserId }]
    })
    .sort({ createdAt: -1 })
    .populate('from', 'username avatar online')
    .populate('to', 'username avatar online');

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
        const dialog = dialogsMap.get(partnerId);
        dialog.unread += 1;
      }
    });

    res.json(Array.from(dialogsMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка диалогов', error: error.message });
  }
};

// ============================================================
// ОТМЕТКА СООБЩЕНИЯ КАК ПРОЧИТАННОГО
// ============================================================
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) return res.status(404).json({ message: 'Сообщение не найдено' });

    if (message.to.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Нет прав для выполнения операции' });
    }

    message.read = true;
    await message.save();
    res.json({ message: 'Сообщение отмечено как прочитанное' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении статуса', error: error.message });
  }
};
