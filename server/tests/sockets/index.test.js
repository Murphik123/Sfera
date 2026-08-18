jest.mock('socket.io', () => ({ Server: jest.fn() }));
jest.mock('../../src/utils/jwt', () => ({ verifyToken: jest.fn() }));
jest.mock('../../src/models/Message', () => {
  const model = jest.fn();
  model.findById = jest.fn();
  return model;
});

const { Server } = require('socket.io');
const { verifyToken } = require('../../src/utils/jwt');
const Message = require('../../src/models/Message');
const initSockets = require('../../src/sockets');

// Собираем зарегистрированные обработчики io.use / io.on('connection')
const setupIo = () => {
  const io = {
    use: jest.fn(),
    on: jest.fn(),
    to: jest.fn(() => ({ emit: io.emit })),
    emit: jest.fn()
  };
  Server.mockReturnValue(io);
  const returned = initSockets({});

  return {
    io,
    returned,
    authHandler: io.use.mock.calls[0][0],
    connectionHandler: io.on.mock.calls.find(([event]) => event === 'connection')[1]
  };
};

const mockSocket = (auth = {}) => {
  const socket = {
    id: 'socket-1',
    handshake: auth,
    userId: undefined,
    join: jest.fn(),
    handlers: {},
    on: jest.fn((event, handler) => {
      socket.handlers[event] = handler;
    })
  };
  return socket;
};

const stubFindByIdPopulated = (result) => {
  const chain = {};
  chain.populate = jest
    .fn()
    .mockImplementationOnce(() => chain)
    .mockImplementationOnce(() => Promise.resolve(result));
  Message.findById.mockReturnValue(chain);
};

describe('sockets/index', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    Message.mockImplementation(function (fields) {
      Object.assign(this, fields);
      this._id = 'msg-1';
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  it('создает сервер socket.io и возвращает его', () => {
    const { io, returned } = setupIo();

    expect(Server).toHaveBeenCalledTimes(1);
    expect(returned).toBe(io);
  });

  describe('аутентификация соединения', () => {
    it('принимает токен из handshake.auth', () => {
      const { authHandler } = setupIo();
      verifyToken.mockReturnValue({ userId: 42 });
      const socket = mockSocket({ auth: { token: 'valid-token' } });
      const next = jest.fn();

      authHandler(socket, next);

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(socket.userId).toBe('42');
      expect(next).toHaveBeenCalledWith();
    });

    it('принимает токен из заголовка Authorization', () => {
      const { authHandler } = setupIo();
      verifyToken.mockReturnValue({ userId: 'user-1' });
      const socket = mockSocket({ headers: { authorization: 'Bearer header-token' } });
      const next = jest.fn();

      authHandler(socket, next);

      expect(verifyToken).toHaveBeenCalledWith('header-token');
      expect(next).toHaveBeenCalledWith();
    });

    it('отклоняет соединение без токена', () => {
      const { authHandler } = setupIo();
      const next = jest.fn();

      authHandler(mockSocket({}), next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(next.mock.calls[0][0].message).toMatch('Token missing');
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('отклоняет соединение с невалидным токеном', () => {
      const { authHandler } = setupIo();
      verifyToken.mockReturnValue(null);
      const next = jest.fn();

      authHandler(mockSocket({ auth: { token: 'broken' } }), next);

      expect(next.mock.calls[0][0].message).toMatch('Invalid token');
    });

    it('отклоняет токен без userId в payload', () => {
      const { authHandler } = setupIo();
      verifyToken.mockReturnValue({ foo: 'bar' });
      const next = jest.fn();

      authHandler(mockSocket({ auth: { token: 'no-user' } }), next);

      expect(next.mock.calls[0][0].message).toMatch('Invalid token');
    });
  });

  describe('обработка соединения', () => {
    const connect = () => {
      const ctx = setupIo();
      const socket = mockSocket({});
      socket.userId = 'user-1';
      ctx.connectionHandler(socket);
      return { ...ctx, socket };
    };

    it('подключает пользователя к личной комнате', () => {
      const { socket } = connect();

      expect(socket.join).toHaveBeenCalledWith('user-1');
      expect(Object.keys(socket.handlers)).toEqual(expect.arrayContaining(['send_message', 'disconnect']));
    });

    it('сохраняет сообщение и рассылает его обоим участникам', async () => {
      const { socket, io } = connect();
      stubFindByIdPopulated({ _id: 'msg-1', text: 'привет' });

      await socket.handlers.send_message({ to: 'user-2', text: 'привет' });

      expect(Message).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'user-1', to: 'user-2', text: 'привет', attachments: [] })
      );
      expect(io.to).toHaveBeenCalledWith('user-2');
      expect(io.to).toHaveBeenCalledWith('user-1');
      expect(io.emit).toHaveBeenCalledTimes(2);
      expect(io.emit).toHaveBeenCalledWith('new_message', { _id: 'msg-1', text: 'привет' });
    });

    it('игнорирует сообщение без получателя или текста', async () => {
      const { socket } = connect();

      await socket.handlers.send_message({ text: 'привет' });
      await socket.handlers.send_message({ to: 'user-2' });

      expect(Message).not.toHaveBeenCalled();
    });

    it('не роняет соединение при ошибке сохранения', async () => {
      const { socket, io } = connect();
      Message.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('db down'));
      });

      await expect(socket.handlers.send_message({ to: 'user-2', text: 'привет' })).resolves.toBeUndefined();
      expect(io.emit).not.toHaveBeenCalled();
    });

    it('обрабатывает отключение без ошибок', () => {
      const { socket } = connect();

      expect(() => socket.handlers.disconnect()).not.toThrow();
    });
  });
});
