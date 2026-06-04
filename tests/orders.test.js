const { request, app, prisma, cleanDb, createUser, createAdmin, createCategory, createProduct } = require('./helpers');

let userToken, adminToken, userId, product, category;

beforeEach(async () => {
  await cleanDb();
  const u = await createUser();
  userToken = u.token;
  userId = u.user.id;
  ({ token: adminToken } = await createAdmin());
  category = await createCategory();
  product = await createProduct(category.id, { price: 25.00, stock: 10 });
});
afterAll(() => prisma.$disconnect());

const addToCart = (token, productId, quantity = 1) =>
  request(app).post('/api/cart').set('Authorization', `Bearer ${token}`).send({ productId, quantity });

const doCheckout = (token, paymentDetails = { cardNumber: '4242424242424242', expiry: '12/26', cvv: '123' }) =>
  request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${token}`).send({ paymentDetails });

describe('POST /api/orders/checkout', () => {
  it('creates an order from cart and clears cart', async () => {
    await addToCart(userToken, product.id, 2);
    const res = await doCheckout(userToken);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PAID');
    expect(parseFloat(res.body.totalAmount)).toBe(50.00);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.paymentRef).toMatch(/^MOCK-/);

    // Cart should be empty
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);
    expect(cart.body.items).toHaveLength(0);
  });

  it('deducts stock after checkout', async () => {
    await addToCart(userToken, product.id, 3);
    await doCheckout(userToken);
    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated.stock).toBe(7);
  });

  it('returns 400 when cart is empty', async () => {
    const res = await doCheckout(userToken);
    expect(res.status).toBe(400);
  });

  it('returns 402 on mock payment decline (card 0000)', async () => {
    await addToCart(userToken, product.id, 1);
    const res = await doCheckout(userToken, { cardNumber: '0000' });
    expect(res.status).toBe(402);
  });

  it('returns 409 if stock is insufficient at checkout', async () => {
    // Manually drop stock to 0 after adding to cart
    await addToCart(userToken, product.id, 2);
    await prisma.product.update({ where: { id: product.id }, data: { stock: 0 } });
    const res = await doCheckout(userToken);
    expect(res.status).toBe(409);
  });
});

describe('GET /api/orders', () => {
  it('returns the user\'s order history', async () => {
    await addToCart(userToken, product.id, 1);
    await doCheckout(userToken);

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('does not show other users orders', async () => {
    const { token: otherToken } = await createUser({ email: 'other@test.com' });
    const p2 = await createProduct(category.id, { name: 'P2' });
    await addToCart(otherToken, p2.id, 1);
    await doCheckout(otherToken);

    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/orders/:id', () => {
  it('user can get their own order', async () => {
    await addToCart(userToken, product.id, 1);
    const checkout = await doCheckout(userToken);
    const orderId = checkout.body.id;

    const res = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
  });

  it('user cannot get another user\'s order', async () => {
    const { token: otherToken } = await createUser({ email: 'other2@test.com' });
    const p2 = await createProduct(category.id, { name: 'P3' });
    await addToCart(otherToken, p2.id, 1);
    const checkout = await doCheckout(otherToken);
    const orderId = checkout.body.id;

    const res = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can get any order', async () => {
    await addToCart(userToken, product.id, 1);
    const checkout = await doCheckout(userToken);
    const orderId = checkout.body.id;

    const res = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
