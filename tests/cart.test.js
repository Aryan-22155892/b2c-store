const { request, app, prisma, cleanDb, createUser, createCategory, createProduct } = require('./helpers');

let userToken, product, category;

beforeEach(async () => {
  await cleanDb();
  ({ token: userToken } = await createUser());
  category = await createCategory();
  product = await createProduct(category.id, { stock: 10, price: 49.99 });
});
afterAll(() => prisma.$disconnect());

describe('GET /api/cart', () => {
  it('returns empty cart for new user', async () => {
    const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.subtotal).toBe(0);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cart', () => {
  it('adds an item to the cart', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(2);
  });

  it('increments quantity if item already in cart', async () => {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 2 });

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(5);
  });

  it('returns 409 when quantity exceeds stock', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 999 });
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown product', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/cart/:productId', () => {
  it('sets exact quantity', async () => {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 1 });

    const res = await request(app)
      .patch(`/api/cart/${product.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(4);
  });
});

describe('DELETE /api/cart/:productId', () => {
  it('removes an item', async () => {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: product.id, quantity: 1 });

    const del = await request(app)
      .delete(`/api/cart/${product.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(del.status).toBe(204);

    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items).toHaveLength(0);
  });
});

describe('DELETE /api/cart', () => {
  it('clears the entire cart', async () => {
    const cat2 = await createCategory('Other');
    const p2 = await createProduct(cat2.id);
    await request(app).post('/api/cart').set('Authorization', `Bearer ${userToken}`).send({ productId: product.id });
    await request(app).post('/api/cart').set('Authorization', `Bearer ${userToken}`).send({ productId: p2.id });

    const del = await request(app).delete('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(del.status).toBe(204);

    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items).toHaveLength(0);
  });
});
