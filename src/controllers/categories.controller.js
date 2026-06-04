const prisma = require('../lib/prisma');

/** GET /api/categories */
const list = async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(categories);
};

/** GET /api/categories/:id */
const getOne = async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
};

/** POST /api/categories — admin only */
const create = async (req, res) => {
  const { name, description } = req.body;
  const category = await prisma.category.create({ data: { name, description } });
  res.status(201).json(category);
};

/** PATCH /api/categories/:id — admin only */
const update = async (req, res) => {
  const { name, description } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });
  res.json(category);
};

/** DELETE /api/categories/:id — admin only */
const remove = async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (count > 0) {
    return res.status(409).json({ error: `Cannot delete: ${count} product(s) still use this category` });
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

module.exports = { list, getOne, create, update, remove };
