const router = require('express').Router();
const { listAllOrders, listUsers, updateUserRole, getStats } = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require ADMIN role
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts, revenue, low stock alerts, recent orders
 */
router.get('/stats', getStats);

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: All orders across all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, PAID, CANCELLED] }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated orders
 */
router.get('/orders', listAllOrders);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: All registered users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated user list with order counts
 */
router.get('/users', listUsers);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Change a user's role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, ADMIN] }
 *     responses:
 *       200:
 *         description: Updated user
 *       400:
 *         description: Cannot demote your own account
 */
router.patch('/users/:id/role', updateUserRole);

module.exports = router;
