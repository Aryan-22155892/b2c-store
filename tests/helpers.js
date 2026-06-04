const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/index');
const prisma = require('../src/lib/prisma');

/** Wipe all rows in dependency order */
const cleanDb = async () => {
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

/** Create a user and return { user, token } */
const createUser = async ({ name = 'Test User', email = 'user@test.com', password = 'password123', role = 'USER' } = {}) => {
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed, role } });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { user, token: res.body.token };
};

/** Create an admin user and return { user, token } */
const createAdmin = async () =>
  createUser({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'ADMIN' });

/** Create a category */
const createCategory = async (name = 'Electronics') =>
  prisma.category.create({ data: { name } });

/** Create a product */
const createProduct = async (categoryId, overrides = {}) =>
  prisma.product.create({
    data: {
      name: 'Test Product',
      description: 'A test product',
      price: 29.99,
      stock: 100,
      categoryId,
      ...overrides,
    },
  });

module.exports = { request, app, prisma, cleanDb, createUser, createAdmin, createCategory, createProduct };
