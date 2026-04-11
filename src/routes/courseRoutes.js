import express from "express"
import {
  getAllCourses,
  getCourseById,
  getCourseCategories,
  getAllOwnedCourses,
  getCourseLearningDetail,
} from "../controllers/courseController.js"
import { verifyToken, optionalAuth } from "../middlewares/authMiddleware.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management and discovery
 */

/**
 * @swagger
 * /api/courses/categories:
 *   get:
 *     summary: Get all unique course categories
 *     tags: [Courses]
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
router.get("/categories", getCourseCategories)
router.get("/owned", verifyToken, getAllOwnedCourses)
/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get courses with pagination, multi-category filtering, and sorting
 *     tags: [Courses]
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
router.get("/", optionalAuth, getAllCourses)

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get a specific course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: The course ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Course found
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
router.get("/:id", optionalAuth, getCourseById)
router.get("/:id/learn", verifyToken, getCourseLearningDetail)
/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Protected route example
 *     tags: [Courses]
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
