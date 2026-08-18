jest.mock('../../src/models/Message', () => {
  const model = jest.fn();
  model.find = jest.fn();
  model.findById = jest.fn();
  return model;
});
jest.mock('../../src/models/User', () => ({}));

const Message = require('../../src/models/Message');
const chatController = require('../../src/controllers/chatController');
const { mockReq, mockRes, mockIo, mockAppWithIo } = require('../helpers/http');

const stubMessageSave = (impl) => {
  Message.mockImplementation(function (fields) {
    Object.assign(this, fields);
    this._id = 'msg-1';
    this.save = jest.fn(impl || (() => Promise.resolve(this)));
  });
};

// Message.findById(id).populate('from').populate('to') — вторая populate резолвит документ
const stubFindByIdPopulated = (result) => {
  const chain = {};
  chain.populate = jest
    .fn()
    .mockImplementationOnce(() => chain)
    .mockImplementationOnce(() => Promise.resolve(result));
  Message.findById.mockReturnValue(chain);
};

// Message.find(query).populate().populate().sort()
const stubFindQuery = (result) => {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => Promise.resolve(result))
  };
  Message.find.mockReturnValue(chain);
  return chain;
};

// Message.find(query).sort().populate('from').populate('to') — порядок вызовов в getDialogs
const stubDialogsQuery = (result) => {
  const chain = {};
  chain.sort = jest.fn(() => chain);
  chain.populate = jest
    .fn()
    .mockImplementationOnce(() => chain)
    .mockImplementationOnce(() => Promise.resolve(result));
  Message.find.mockReturnValue(chain);
  return chain;
};

describe('controllers/chatController', () => {
  beforeEach(() => {
    stubMessageSave();
  });

  describe('sendMessage', () => {
    const sendReq = (body, io) => mockReq({ userId: 'user-1', body, app: mockAppWithIo(io) });

    it('сохраняет сообщение и рассылает его обоим участникам', async () => {
      stubFindByIdPopulated({ _id: 'msg-1', text: 'привет' });
      const io = mockIo();
      const res = mockRes();

      await chatController.sendMessage(sendReq({ to: 'user-2', text: 'привет' }, io), res);

      expect(Message).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'user-1', to: 'user-2', text: 'привет' })
      );
      expect(io.to).toHaveBeenCalledWith('user-2');
      expect(io.to).toHaveBeenCalledWith('user-1');
      expect(io.emit).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toEqual({ _id: 'msg-1', text: 'привет' });
    });

    it('принимает сообщение только с вложениями', async () => {
      stubFindByIdPopulated({ _id: 'msg-1' });
      const res = mockRes();

      await chatController.sendMessage(sendReq({ to: 'user-2', attachments: ['a.png'] }), res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it.each([
      ['без получателя', { text: 'привет' }],
      ['без текста и вложений', { to: 'user-2' }],
      ['с пустым списком вложений', { to: 'user-2', attachments: [] }]
    ])('возвращает 400 %s', async (_label, body) => {
      const res = mockRes();

      await chatController.sendMessage(sendReq(body), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ message: 'Укажите получателя и текст/файлы сообщения' });
      expect(Message).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке сохранения', async () => {
      stubMessageSave(() => Promise.reject(new Error('db down')));
      const res = mockRes();

      await chatController.sendMessage(sendReq({ to: 'user-2', text: 'привет' }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при отправке сообщения', error: 'db down' });
    });
  });

  describe('getMessages', () => {
    it('возвращает переписку в хронологическом порядке', async () => {
      const messages = [{ _id: 'msg-1' }];
      const chain = stubFindQuery(messages);
      const res = mockRes();

      await chatController.getMessages(mockReq({ userId: 'user-1', params: { userId: 'user-2' } }), res);

      expect(Message.find).toHaveBeenCalledWith({
        $or: [
          { from: 'user-1', to: 'user-2' },
          { from: 'user-2', to: 'user-1' }
        ]
      });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(res.body).toBe(messages);
    });

    it('возвращает 500 при ошибке базы', async () => {
      Message.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await chatController.getMessages(mockReq({ userId: 'user-1', params: { userId: 'user-2' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при получении сообщений', error: 'db down' });
    });
  });

  describe('getDialogs', () => {
    const msg = (from, to, fields = {}) => ({
      from: { _id: from },
      to: { _id: to },
      text: 'текст',
      createdAt: new Date('2024-01-01'),
      read: false,
      ...fields
    });

    it('группирует сообщения по собеседнику и берет последнее как превью', async () => {
      stubDialogsQuery([
        msg('user-1', 'user-2', { text: 'последнее' }),
        msg('user-2', 'user-1', { text: 'старое', read: true })
      ]);
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'user-2', lastMessage: 'последнее' });
    });

    it('считает непрочитанные входящие сообщения', async () => {
      stubDialogsQuery([
        msg('user-2', 'user-1', { text: 'раз' }),
        msg('user-2', 'user-1', { text: 'два' }),
        msg('user-2', 'user-1', { text: 'прочитано', read: true })
      ]);
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.body[0].unread).toBe(2);
    });

    it('не считает непрочитанными собственные сообщения', async () => {
      stubDialogsQuery([msg('user-1', 'user-2'), msg('user-1', 'user-2')]);
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.body[0].unread).toBe(0);
    });

    it('возвращает отдельный диалог на каждого собеседника', async () => {
      stubDialogsQuery([msg('user-1', 'user-2'), msg('user-3', 'user-1')]);
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.body.map((d) => d.id)).toEqual(['user-2', 'user-3']);
    });

    it('возвращает пустой список, если сообщений нет', async () => {
      stubDialogsQuery([]);
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.body).toEqual([]);
    });

    it('возвращает 500 при ошибке базы', async () => {
      Message.find.mockImplementation(() => {
        throw new Error('db down');
      });
      const res = mockRes();

      await chatController.getDialogs(mockReq({ userId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при получении списка диалогов', error: 'db down' });
    });
  });

  describe('markAsRead', () => {
    it('отмечает сообщение получателя прочитанным', async () => {
      const message = { to: 'user-1', read: false, save: jest.fn().mockResolvedValue(undefined) };
      Message.findById.mockResolvedValue(message);
      const res = mockRes();

      await chatController.markAsRead(mockReq({ userId: 'user-1', params: { messageId: 'msg-1' } }), res);

      expect(message.read).toBe(true);
      expect(message.save).toHaveBeenCalled();
      expect(res.body).toEqual({ message: 'Сообщение отмечено как прочитанное' });
    });

    it('возвращает 404, если сообщения нет', async () => {
      Message.findById.mockResolvedValue(null);
      const res = mockRes();

      await chatController.markAsRead(mockReq({ userId: 'user-1', params: { messageId: 'msg-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ message: 'Сообщение не найдено' });
    });

    it('возвращает 403, если пользователь не получатель', async () => {
      const message = { to: 'user-2', read: false, save: jest.fn() };
      Message.findById.mockResolvedValue(message);
      const res = mockRes();

      await chatController.markAsRead(mockReq({ userId: 'user-1', params: { messageId: 'msg-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body).toEqual({ message: 'Нет прав для выполнения операции' });
      expect(message.save).not.toHaveBeenCalled();
    });

    it('возвращает 500 при ошибке базы', async () => {
      Message.findById.mockRejectedValue(new Error('db down'));
      const res = mockRes();

      await chatController.markAsRead(mockReq({ userId: 'user-1', params: { messageId: 'msg-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body).toEqual({ message: 'Ошибка при обновлении статуса', error: 'db down' });
    });
  });
});
