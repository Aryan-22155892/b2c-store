const router = require('express').Router();
const { body } = require('express-validator');
const { checkout, listOrders, getOrder } = require('../controllers/orders.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Checkout and purchase history
 */

/**
 * @swagger
 * /orders/checkout:
 *   post:
 *     summary: Checkout — converts cart to a paid order (mock payment)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   cardNumber:
 *                     type: string
 *                     description: Use "0000" to simulate a declined card
 *                     example: "4242424242424242"
 *                   expiry:
 *                     type: string
 *                     example: "12/26"
 *                   cvv:
 *                     type: string
 *                     example: "123"
 *     responses:
 *       201:
 *         description: Order created and paid
 *       400:
 *         description: Cart is empty
 *       402:
 *         description: Payment declined
 *       409:
 *         description: Insufficient stock for one or more items
 */
router.post(
  '/checkout',
  [
    body('paymentDetails').optional().isObject(),
    validate,
  ],
  checkout
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get the authenticated user's order history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated order list
 */
router.get('/', listOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order detail with line items
 *       403:
 *         description: Forbidden (not your order and not admin)
 *       404:
 *         description: Order not found
 */
router.get('/:id', getOrder);

module.exports = router;
