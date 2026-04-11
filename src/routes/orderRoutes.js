import express from "express"
import { verifyToken } from "../middlewares/authMiddleware.js"
import { getUserOrders, getOrderById } from "../controllers/orderController.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders of the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get("/", verifyToken, getUserOrders)

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get specific order details including courses and prompts
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details with items
 *       404:
 *         description: Order not found
 */
router.get("/:id", verifyToken, getOrderById)

export default router
