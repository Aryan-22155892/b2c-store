const { request, app, prisma, cleanDb, createUser, createAdmin, createCategory, createProduct } = require('./helpers');

let adminToken, userToken, category, product;

beforeEach(async () => {
  await cleanDb();
  ({ token: adminToken } = await createAdmin());
  ({ token: userToken } = await createUser());
  category = await createCategory('Electronics');
  product = await createProduct(category.id, { name: 'Laptop', price: 999.99, stock: 10 });
});
afterAll(() => prisma.$disconnect());

describe('GET /api/products', () => {
  it('lists products with pagination meta', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('filters by categoryId', async () => {
    const cat2 = await createCategory('Books');
    await createProduct(cat2.id, { name: 'Novel' });
    const res = await request(app).get(`/api/products?categoryId=${category.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.categoryId === category.id)).toBe(true);
  });

  it('searches by name (case-insensitive)', async () => {
    await createProduct(category.id, { name: 'Headphones' });
    const res = await request(app).get('/api/products?search=laptop');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Laptop');
  });

  it('filters by price range', async () => {
    await createProduct(category.id, { name: 'Cheap Item', price: 5 });
    const res = await request(app).get('/api/products?minPrice=100');
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => parseFloat(p.price) >= 100)).toBe(true);
  });
});

describe('GET /api/products/:id', () => {
  it('returns a product by id', async () => {
    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Laptop');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products (admin only)', () => {
  it('admin can create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Phone', price: 699, categoryId: category.id, stock: 5 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Phone');
  });

  it('regular user cannot create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Nope', price: 10, categoryId: category.id });
    expect(res.status).toBe(403);
  });

  it('returns 422 if price is missing', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Price', categoryId: category.id });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/products/:id (admin only)', () => {
  it('admin can update a product', async () => {
    const res = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 849.99, stock: 20 });
    expect(res.status).toBe(200);
    expect(parseFloat(res.body.price)).toBe(849.99);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ price: 1 });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/products/:id (admin only)', () => {
  it('admin can delete a product', async () => {
    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
