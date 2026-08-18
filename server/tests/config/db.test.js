jest.mock('mongoose', () => ({ connect: jest.fn() }));

const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');

describe('config/db', () => {
  let exitSpy;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
  });

  it('подключается по MONGODB_URI', async () => {
    process.env.MONGODB_URI = 'mongodb://primary/sfera';
    mongoose.connect.mockResolvedValue({ connection: { host: 'primary' } });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://primary/sfera');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('использует MONGO_URI как запасную переменную', async () => {
    process.env.MONGO_URI = 'mongodb://fallback/sfera';
    mongoose.connect.mockResolvedValue({ connection: { host: 'fallback' } });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://fallback/sfera');
  });

  it('завершает процесс, если строка подключения не задана', async () => {
    await connectDB();

    expect(mongoose.connect).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('завершает процесс при ошибке подключения', async () => {
    process.env.MONGODB_URI = 'mongodb://primary/sfera';
    mongoose.connect.mockRejectedValue(new Error('unreachable'));

    await connectDB();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
