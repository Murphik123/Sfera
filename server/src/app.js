// Этот файл пока не используется, но нужен для структуры.
// Позже сюда перенесём основную логику.
module.exports = {};
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
