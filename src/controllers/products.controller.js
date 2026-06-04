const prisma = require('../lib/prisma');

/**
 * GET /api/products
 * Query params: search, categoryId, minPrice, maxPrice, page, limit, sortBy, order
 */
const list = async (req, res) => {
  const {
    search,
    categoryId,
    minPrice,
    maxPrice,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query;

  const where = {
    ...(search && {
      name: { contains: search, mode: 'insensitive' },
    }),
    ...(categoryId && { categoryId }),
    ...((minPrice || maxPrice) && {
      price: {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      },
    }),
  };

  const validSortFields = ['name', 'price', 'createdAt', 'stock'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = Math.min(parseInt(limit), 100);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    data: products,
    meta: {
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
};

/**
 * GET /api/products/:id
 */
const getOne = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

/**
 * POST /api/products — admin only
 */
const create = async (req, res) => {
  const { name, description, price, imageUrl, stock, categoryId } = req.body;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const product = await prisma.product.create({
    data: { name, description, price: parseFloat(price), imageUrl, stock: parseInt(stock ?? 0), categoryId },
    include: { category: { select: { id: true, name: true } } },
  });
  res.status(201).json(product);
};

/**
 * PATCH /api/products/:id — admin only
 */
const update = async (req, res) => {
  const { name, description, price, imageUrl, stock, categoryId } = req.body;

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ error: 'Category not found' });
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(categoryId !== undefined && { categoryId }),
    },
    include: { category: { select: { id: true, name: true } } },
  });
  res.json(product);
};

/**
 * DELETE /api/products/:id — admin only
 */
const remove = async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

module.exports = { list, getOne, create, update, remove };
