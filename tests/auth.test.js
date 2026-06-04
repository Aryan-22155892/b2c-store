const { request, app, prisma, cleanDb, createUser } = require('./helpers');

beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('jane@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 409 if email already registered', async () => {
    await createUser({ email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: 'dup@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('returns 422 if password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad',
      email: 'bad@example.com',
      password: '123',
    });
    expect(res.status).toBe(422);
  });

  it('returns 422 if email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'mypassword' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'mypassword',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 with wrong password', async () => {
    await createUser({ email: 'check@example.com', password: 'correct' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'check@example.com',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const { token, user } = await createUser({ email: 'me@example.com' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a bad token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
