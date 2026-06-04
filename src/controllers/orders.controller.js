const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

/**
 * Simulates a payment gateway.
 * In production, replace with Stripe / PayPal SDK call.
 * Returns { success, paymentRef } or throws on failure.
 */
const mockPaymentGateway = async ({ totalAmount, paymentDetails }) => {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 50));

  // Simulate card decline for test card number "0000"
  if (paymentDetails?.cardNumber === '0000') {
    throw Object.assign(new Error('Payment declined'), { status: 402 });
  }

  return { success: true, paymentRef: `MOCK-${uuidv4()}` };
};

/**
 * POST /api/orders/checkout
 * Converts the user's cart into a paid order.
 * Body: { paymentDetails: { cardNumber, expiry, cvv } }  ← mock fields
 */
const checkout = async (req, res) => {
  const { paymentDetails } = req.body;
  const userId = req.user.id;

  // Load cart
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Validate stock for all items
  const stockErrors = cartItems.filter((item) => item.product.stock < item.quantity);
  if (stockErrors.length > 0) {
    return res.status(409).json({
      error: 'Insufficient stock',
      items: stockErrors.map((i) => ({ productId: i.productId, available: i.product.stock })),
    });
  }

  // Calculate total
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  // Run mock payment
  const { paymentRef } = await mockPaymentGateway({
    totalAmount,
    paymentDetails,
  });

  // Create order + deduct stock in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        status: 'PAID',
        paymentRef,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
      },
    });

    // Deduct stock
    await Promise.all(
      cartItems.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    return newOrder;
  });

  res.status(201).json(order);
};

/**
 * GET /api/orders
 * Returns paginated order history for the authenticated user.
 */
const listOrders = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = Math.min(parseInt(limit), 50);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: req.user.id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
    }),
    prisma.order.count({ where: { userId: req.user.id } }),
  ]);

  res.json({
    data: orders,
    meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
  });
};

/**
 * GET /api/orders/:id
 * Returns one order — must belong to the requesting user (or be admin).
 */
const getOrder = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, imageUrl: true, price: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Regular users can only see their own orders
  if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(order);
};

module.exports = { checkout, listOrders, getOrder };
