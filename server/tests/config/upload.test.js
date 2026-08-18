const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(__dirname, '../../uploads');

describe('config/upload', () => {
  const loadUpload = () => {
    jest.resetModules();
    return require('../../src/config/upload');
  };

  it('создает папку uploads, если её нет', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

    loadUpload();

    expect(mkdirSpy).toHaveBeenCalledWith(uploadDir, { recursive: true });
  });

  it('не создает папку повторно, если она уже есть', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

    loadUpload();

    expect(mkdirSpy).not.toHaveBeenCalled();
  });

  it('ограничивает размер файла 5 МБ', () => {
    const { upload } = loadUpload();

    expect(upload.limits.fileSize).toBe(5 * 1024 * 1024);
  });

  it('сохраняет файлы в папку uploads', () => {
    const { upload } = loadUpload();
    const cb = jest.fn();

    upload.storage.getDestination({}, { originalname: 'a.png' }, cb);

    expect(cb).toHaveBeenCalledWith(null, uploadDir);
  });

  it('генерирует уникальное имя файла с исходным расширением', () => {
    const { upload } = loadUpload();
    const cb = jest.fn();

    upload.storage.getFilename({}, { originalname: 'photo.PNG' }, cb);

    const [, filename] = cb.mock.calls[0];
    expect(filename).toMatch(/^listing-\d+-\d+\.PNG$/);
  });

  it('подставляет .jpg для файла без расширения', () => {
    const { upload } = loadUpload();
    const cb = jest.fn();

    upload.storage.getFilename({}, { originalname: 'photo' }, cb);

    expect(cb.mock.calls[0][1]).toMatch(/\.jpg$/);
  });
});
