import express from "express"
import {
  addCart,
  deleteCourseCart,
  getUserCart,
  createPaymentIntent,
  confirmOrderSuccess,
  getCartCount,
} from "../controllers/cartController.js"
import { verifyToken } from "../middlewares/authMiddleware.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 code: { type: number, example: 200 }
 *                 message: { type: string, example: "Success" }
 *                 payload:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId: { type: integer, example: 7 }
 *                       title: { type: string, example: "JavaScript Basics" }
 *                       price: { type: number, example: 19.99 }
 *                       quantity: { type: integer, example: 1 }
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       500:
 *         description: Internal Server Error
 */
router.get("/", verifyToken, getUserCart)

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add an item to the user's cart
 *     description: Adds a course (and/or prompt) to the cart. If the item already exists, it increments the quantity.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: integer
 *                 description: The ID of the course to add
 *                 example: 10
 *               promptId:
 *                 type: integer
 *                 description: The ID of the prompt to add
 *                 example: 5
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 code: { type: number, example: 200 }
 *                 message: { type: string, example: "Add to cart successfully" }
 *                 payload: { type: object, nullable: true, example: null }
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       500:
 *         description: Internal Server Error
 */
router.post("/", verifyToken, addCart)

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Remove a course from the user's cart
 *     description: Deletes a specific course from the authenticated user's shopping cart using its courseId.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the course to remove from the cart
 *         example: 10
 *     responses:
 *       200:
 *         description: Course successfully removed from cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 code: { type: number, example: 200 }
 *                 message: { type: string, example: "Delete item successfully" }
 *                 payload: { type: object, nullable: true, example: null }
 *       400:
 *         description: Bad Request - Missing or invalid courseId
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       500:
 *         description: Internal Server Error
 */

router.get("/count", verifyToken, getCartCount)
router.delete("/:courseId", verifyToken, deleteCourseCart)
router.post("/create-payment-intent", verifyToken, createPaymentIntent)
router.post("/confirm-success", verifyToken, confirmOrderSuccess)

export default router
