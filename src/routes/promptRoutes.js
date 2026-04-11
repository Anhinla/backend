import express from "express"
import { verifyToken } from "../middlewares/authMiddleware.js"
import { getPromptCategories, getAllPrompts,getPromptById} from "../controllers/promptController.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Prompts
 *   description: Prompt management and discovery
 */

/**
 * @swagger
 * /api/prompts/categories:
 *   get:
 *     summary: Get all unique prompt categories
 *     tags: [Prompts]
 *     responses:
 *       200:
 *         description: Successfully retrieved all categories
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
 *                   items: { type: string }
 *                   example: ["AI Art", "Marketing", "Coding"]
 */
router.get("/categories", getPromptCategories)

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: Get prompts with pagination, multi-category filtering, and sorting
 *     tags: [Prompts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by one or more categories (comma separated, e.g., "AI Art,Marketing")
 *       - in: query
 *         name: sort_field
 *         schema: { type: string, example: "price" }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *       - in: query
 *         name: min_vote
 *         schema: { type: integer, example: 4 }
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", getAllPrompts)

/**
 * @swagger
 * /api/prompts/{id}:
 *   get:
 *     summary: Get a specific prompts by ID
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: The prompt ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Prompts found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 code: { type: number, example: 200 }
 *                 message: { type: string, example: "Success" }
 *                 payload: { type: object }
 *       404:
 *         description: Course not found
 */
router.get("/:id", getPromptById)

/**
 * @swagger
 * /api/prompts:
 *   post:
 *     summary: Protected route example
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Access granted
 *       401:
 *         description: Unauthorized
 */
router.post("/", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    code: 200,
    message: "Success",
    payload: {
      user: req.user,
    },
  })
})

export default router
