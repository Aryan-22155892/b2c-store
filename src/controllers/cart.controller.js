const prisma = require('../lib/prisma');

const cartInclude = {
  product: {
    select: { id: true, name: true, price: true, imageUrl: true, stock: true },
  },
};

/** GET /api/cart */
const getCart = async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: cartInclude,
  });

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  res.json({ items, subtotal: parseFloat(subtotal.toFixed(2)), itemCount: items.length });
};

/** POST /api/cart — add item or increment quantity */
const addItem = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const qty = parseInt(quantity);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < qty) {
    return res.status(409).json({ error: `Only ${product.stock} in stock` });
  }

  // Upsert: if item exists, increment; otherwise create
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } },
  });

  let item;
  if (existing) {
    const newQty = existing.quantity + qty;
    if (product.stock < newQty) {
      return res.status(409).json({ error: `Only ${product.stock} in stock` });
    }
    item = await prisma.cartItem.update({
      where: { userId_productId: { userId: req.user.id, productId } },
      data: { quantity: newQty },
      include: cartInclude,
    });
  } else {
    item = await prisma.cartItem.create({
      data: { userId: req.user.id, productId, quantity: qty },
      include: cartInclude,
    });
  }

  res.status(201).json(item);
};

/** PATCH /api/cart/:productId — set exact quantity */
const updateItem = async (req, res) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity);

  if (qty < 1) {
    return res.status(422).json({ error: 'Quantity must be at least 1' });
  }

  const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < qty) {
    return res.status(409).json({ error: `Only ${product.stock} in stock` });
  }

  const item = await prisma.cartItem.update({
    where: { userId_productId: { userId: req.user.id, productId: req.params.productId } },
    data: { quantity: qty },
    include: cartInclude,
  });
  res.json(item);
};

/** DELETE /api/cart/:productId — remove one item */
const removeItem = async (req, res) => {
  await prisma.cartItem.delete({
    where: { userId_productId: { userId: req.user.id, productId: req.params.productId } },
  });
  res.status(204).send();
};

/** DELETE /api/cart — clear the whole cart */
const clearCart = async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
  res.status(204).send();
};

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
