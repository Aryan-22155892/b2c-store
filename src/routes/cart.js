const router = require('express').Router();
const { body, param } = require('express-validator');
const { getCart, addItem, updateItem, removeItem, clearCart } = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All cart routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/** @swagger
 * /cart:
 *   get:
 *     summary: Get the current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items, subtotal, and itemCount
 */
router.get('/', getCart);

/** @swagger
 * /cart:
 *   post:
 *     summary: Add an item to the cart (or increment quantity)
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer, default: 1 }
 *     responses:
 *       201:
 *         description: Item added / updated
 *       409:
 *         description: Insufficient stock
 */
router.post(
  '/',
  [
    body('productId').notEmpty().withMessage('productId is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be >= 1'),
    validate,
  ],
  addItem
);

/** @swagger
 * /cart/{productId}:
 *   patch:
 *     summary: Set exact quantity for a cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:productId',
  [
    param('productId').notEmpty(),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be >= 1'),
    validate,
  ],
  updateItem
);

/** @swagger
 * /cart/{productId}:
 *   delete:
 *     summary: Remove one item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Removed
 */
router.delete('/:productId', removeItem);

/** @swagger
 * /cart:
 *   delete:
 *     summary: Clear the entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Cart cleared
 */
router.delete('/', clearCart);

module.exports = router;
