const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: mockSend } }))
}));

const { Resend } = require('resend');
const mailController = require('../../src/controllers/mailController');
const { mockReq, mockRes } = require('../helpers/http');

describe('controllers/mailController.sendMail', () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    Resend.mockImplementation(() => ({ emails: { send: mockSend } }));
    mockSend.mockResolvedValue({ data: { id: 'mail-1' } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it('отправляет письмо и возвращает id', async () => {
    const res = mockRes();

    await mailController.sendMail(
      mockReq({ body: { to: 'user@example.com', subject: 'Тема', html: '<p>Привет</p>' } }),
      res
    );

    expect(Resend).toHaveBeenCalledWith('test-key');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['user@example.com'], subject: 'Тема', html: '<p>Привет</p>' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ success: true, message: 'Email sent successfully.', id: 'mail-1' });
  });

  it('подставляет тему по умолчанию и оборачивает text в html', async () => {
    await mailController.sendMail(
      mockReq({ body: { to: 'user@example.com', text: 'Просто текст' } }),
      mockRes()
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Notification from Sfera', html: '<p>Просто текст</p>' })
    );
  });

  it('использует html-заглушку, если нет ни html, ни text', async () => {
    await mailController.sendMail(mockReq({ body: { to: 'user@example.com' } }), mockRes());

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<p>Hello from Sfera!</p>' })
    );
  });

  it('возвращает 503, если ключ Resend не настроен', async () => {
    delete process.env.RESEND_API_KEY;
    const res = mockRes();

    await mailController.sendMail(mockReq({ body: { to: 'user@example.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body).toEqual({
      success: false,
      message: 'Email service is not configured on the server.'
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each([
    ['адреса нет', undefined],
    ['адрес не строка', 12345],
    ['адрес без @', 'not-an-email']
  ])('возвращает 400, если %s', async (_label, to) => {
    const res = mockRes();

    await mailController.sendMail(mockReq({ body: { to } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Please provide a valid recipient email address.'
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('возвращает 400, если Resend вернул ошибку в теле ответа', async () => {
    mockSend.mockResolvedValue({ error: { message: 'domain not verified' } });
    const res = mockRes();

    await mailController.sendMail(mockReq({ body: { to: 'user@example.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ success: false, message: 'Failed to send email.' });
  });

  it('возвращает 500, если запрос к Resend упал', async () => {
    mockSend.mockRejectedValue(new Error('network error'));
    const res = mockRes();

    await mailController.sendMail(mockReq({ body: { to: 'user@example.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Failed to send email.',
      error: 'network error'
    });
  });

  it('не падает, если ответ Resend не содержит data.id', async () => {
    mockSend.mockResolvedValue({});
    const res = mockRes();

    await mailController.sendMail(mockReq({ body: { to: 'user@example.com' } }), res);

    expect(res.body).toMatchObject({ success: true, id: null });
  });
});
