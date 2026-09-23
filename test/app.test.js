const request = require('supertest');
const app = require('../app');

describe('Express app', () => {
  it('GET / responds with HTTP 200 and Hello World', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello World!');
  });

  it('GET / returns an HTML content type', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('unknown routes return 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
