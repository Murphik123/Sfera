const mockTo = jest.fn(() => ({ emit: mockRoomEmit }));
const mockRoomEmit = jest.fn();
const mockEmit = jest.fn();
const mockOn = jest.fn();

jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({ on: mockOn, to: mockTo, emit: mockEmit }))
}));

const { Server } = require('socket.io');
const initSocket = require('../../src/sockets/serverSocket');

describe('sockets/serverSocket', () => {
  let socket;
  let handlers;

  const connect = () => {
    const connectionHandler = mockOn.mock.calls.find(([event]) => event === 'connection')[1];
    handlers = {};
    socket = {
      id: 'socket-1',
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      })
    };
    connectionHandler(socket);
  };

  const httpServer = {};

  beforeEach(() => {
    mockTo.mockImplementation(() => ({ emit: mockRoomEmit }));
    Server.mockImplementation(() => ({ on: mockOn, to: mockTo, emit: mockEmit }));
    initSocket(httpServer);
    connect();
  });

  it('создает Socket.IO сервер с открытым CORS', () => {
    expect(Server).toHaveBeenCalledWith(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });
  });

  it('регистрирует обработчики всех событий', () => {
    expect(Object.keys(handlers).sort()).toEqual([
      'answer_call',
      'call_user',
      'disconnect',
      'end_call',
      'ice_candidate',
      'register_user',
      'send_message'
    ]);
  });

  describe('register_user', () => {
    it('запоминает пользователя и рассылает статус online', () => {
      handlers.register_user(42);

      expect(socket.userId).toBe('42');
      expect(mockEmit).toHaveBeenCalledWith('user_status_change', { userId: '42', online: true });
    });

    it('игнорирует пустой userId', () => {
      handlers.register_user(undefined);

      expect(socket.userId).toBeUndefined();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('send_message', () => {
    it('доставляет сообщение в сокет получателя', () => {
      handlers.register_user('42');
      handlers.send_message({ recipientId: 42, text: 'привет' });

      expect(mockTo).toHaveBeenCalledWith('socket-1');
      expect(mockRoomEmit).toHaveBeenCalledWith('receive_message', {
        senderId: '42',
        recipientId: 42,
        text: 'привет'
      });
    });

    it('ничего не отправляет, если получатель офлайн', () => {
      handlers.send_message({ recipientId: 'offline', text: 'привет' });

      expect(mockTo).not.toHaveBeenCalled();
    });
  });

  describe('WebRTC сигналинг', () => {
    beforeEach(() => {
      handlers.register_user('42');
    });

    it('пересылает приглашение на звонок', () => {
      handlers.call_user({ userToCall: '42', signalData: 'offer', isVideo: true });

      expect(mockRoomEmit).toHaveBeenCalledWith('incoming_call', {
        signal: 'offer',
        from: '42',
        isVideo: true
      });
    });

    it('пересылает ответ на звонок', () => {
      handlers.answer_call({ to: '42', signal: 'answer' });

      expect(mockRoomEmit).toHaveBeenCalledWith('call_accepted', 'answer');
    });

    it('пересылает ICE-кандидата', () => {
      handlers.ice_candidate({ to: '42', candidate: 'candidate-1' });

      expect(mockRoomEmit).toHaveBeenCalledWith('ice_candidate', {
        candidate: 'candidate-1',
        from: '42'
      });
    });

    it('сообщает о завершении звонка', () => {
      handlers.end_call({ to: '42' });

      expect(mockRoomEmit).toHaveBeenCalledWith('call_ended');
    });

    it.each([
      ['call_user', { userToCall: 'offline' }],
      ['answer_call', { to: 'offline' }],
      ['ice_candidate', { to: 'offline' }],
      ['end_call', { to: 'offline' }]
    ])('не отправляет %s офлайн-пользователю', (event, payload) => {
      mockTo.mockClear();

      handlers[event](payload);

      expect(mockTo).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('удаляет пользователя из онлайна и рассылает статус offline', () => {
      handlers.register_user('42');
      mockEmit.mockClear();

      handlers.disconnect();
      handlers.send_message({ recipientId: '42', text: 'привет' });

      expect(mockEmit).toHaveBeenCalledWith('user_status_change', { userId: '42', online: false });
      expect(mockTo).not.toHaveBeenCalled();
    });

    it('ничего не рассылает для незарегистрированного сокета', () => {
      handlers.disconnect();

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
