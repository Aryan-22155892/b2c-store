const prisma = require('../lib/prisma');

const listAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, userId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = Math.min(parseInt(limit), 100);

  const where = {
    ...(status && { status }),
    ...(userId && { userId }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    data: orders,
    meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
  });
};

/**
 * GET /api/admin/users
 * All registered users.
 */
const listUsers = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = Math.min(parseInt(limit), 100);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count(),
  ]);

  res.json({
    data: users,
    meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
  });
};

/**
 * PATCH /api/admin/users/:id/role
 * Promote or demote a user.
 */
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'ADMIN'].includes(role)) {
    return res.status(422).json({ error: 'Role must be USER or ADMIN' });
  }
  // Prevent admin from demoting themselves
  if (req.params.id === req.user.id && role === 'USER') {
    return res.status(400).json({ error: 'Cannot demote your own account' });
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
};

/**
 * GET /api/admin/stats
 * Dashboard summary stats.
 */
const getStats = async (req, res) => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    revenueResult,
    lowStock,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.product.findMany({
      where: { stock: { lte: 5 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 5,
    }),
    prisma.order.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  res.json({
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue: parseFloat(revenueResult._sum.totalAmount || 0),
    lowStockProducts: lowStock,
    recentOrders,
  });
};

module.exports = { listAllOrders, listUsers, updateUserRole, getStats };
