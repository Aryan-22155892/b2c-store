const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics', description: 'Gadgets and devices' },
    }),
    prisma.category.upsert({
      where: { name: 'Clothing' },
      update: {},
      create: { name: 'Clothing', description: 'Apparel and accessories' },
    }),
    prisma.category.upsert({
      where: { name: 'Books' },
      update: {},
      create: { name: 'Books', description: 'Physical and digital books' },
    }),
    prisma.category.upsert({
      where: { name: 'Home & Garden' },
      update: {},
      create: { name: 'Home & Garden', description: 'Home improvement and gardening' },
    }),
  ]);

  const [electronics, clothing, books, homeGarden] = categories;

  // Products
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones with 30hr battery life.',
        price: 149.99,
        stock: 50,
        categoryId: electronics.id,
        imageUrl: '/products/wireless_headphones.webp',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mechanical Keyboard',
        description: 'Compact TKL mechanical keyboard with RGB backlighting.',
        price: 89.99,
        stock: 30,
        categoryId: electronics.id,
        imageUrl: '/products/mechanical_keyboard.webp',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Classic Denim Jacket',
        description: 'Timeless denim jacket, available in multiple sizes.',
        price: 59.99,
        stock: 100,
        categoryId: clothing.id,
        imageUrl: '/products/denim_jacket.webp',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Running Sneakers',
        description: 'Lightweight performance sneakers for daily running.',
        price: 74.99,
        stock: 75,
        categoryId: clothing.id,
        imageUrl: '/products/running_sneakers.jpg',
      },
    }),
    prisma.product.create({
      data: {
        name: 'The Pragmatic Programmer',
        description: 'Classic software engineering guide. 20th anniversary edition.',
        price: 34.99,
        stock: 200,
        categoryId: books.id,
        imageUrl: '/products/the_pragmatic_programmer.jpg',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Indoor Plant Pot Set',
        description: 'Set of 3 ceramic plant pots with drainage holes.',
        price: 24.99,
        stock: 60,
        categoryId: homeGarden.id,
        imageUrl: '/products/indoor_plant.webp',
      },
    }),
  ]);

  // Admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      email: 'admin@store.com',
      password: hashedPassword,
      name: 'Store Admin',
      role: 'ADMIN',
    },
  });

  // Regular user
  const userPassword = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@store.com' },
    update: {},
    create: {
      email: 'user@store.com',
      password: userPassword,
      name: 'Test User',
      role: 'USER',
    },
  });

  console.log('Seed complete.');
  console.log('  Admin: admin@store.com / admin123');
  console.log('  User:  user@store.com  / user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
