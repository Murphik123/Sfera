const express = require('express');
const request = require('supertest');
const statsRoutes = require('../../src/routes/statsRoutes');

const app = express();
app.use('/api/stats', statsRoutes);

describe('routes/statsRoutes', () => {
  it('отдает публичную статистику для главной страницы', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      online: 1842,
      users: 2340000,
      orders: 18540291,
      docs: 11328901,
      coin: 21000000
    });
  });
});
