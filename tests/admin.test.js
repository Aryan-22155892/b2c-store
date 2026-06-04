const { request, app, prisma, cleanDb, createUser, createAdmin, createCategory, createProduct } = require('./helpers');

let adminToken, userToken;

beforeEach(async () => {
  await cleanDb();
  ({ token: adminToken } = await createAdmin());
  ({ token: userToken } = await createUser());
});
afterAll(() => prisma.$disconnect());

describe('GET /api/admin/stats', () => {
  it('returns dashboard stats for admin', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('lowStockProducts');
  });

  it('returns 403 for regular users', async () => {
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/orders', () => {
  it('returns all orders', async () => {
    const cat = await createCategory();
    const prod = await createProduct(cat.id, { stock: 5 });
    // Place an order as the regular user
    await request(app).post('/api/cart').set('Authorization', `Bearer ${userToken}`).send({ productId: prod.id });
    await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${userToken}`).send({
      paymentDetails: { cardNumber: '4242' },
    });

    const res = await request(app).get('/api/admin/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user).toBeDefined();
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/admin/orders?status=PAID')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/users', () => {
  it('returns all users', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // admin + regular user created in beforeEach
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // Password must never be returned
    expect(res.body.data[0].password).toBeUndefined();
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  it('admin can promote a user to ADMIN', async () => {
    const { user } = await createUser({ email: 'promote@test.com' });
    const res = await request(app)
      .patch(`/api/admin/users/${user.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });

  it('returns 422 for invalid role', async () => {
    const { user } = await createUser({ email: 'bad@test.com' });
    const res = await request(app)
      .patch(`/api/admin/users/${user.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SUPERUSER' });
    expect(res.status).toBe(422);
  });
});
