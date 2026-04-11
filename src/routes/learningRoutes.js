import express from "express"
import { verifyToken } from "../middlewares/authMiddleware.js"
import { getUserEnrolledCourses } from "../controllers/learningController.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Learning
 *   description: Management of user enrolled courses and learning progress
 */

/**
 * @swagger
 * /api/learning/courses:
 *   get:
 *     summary: Get all courses the authenticated user has enrolled in (purchased)
 *     tags: [Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enrolled courses with their details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 code: { type: number, example: 200 }
 *                 message: { type: string, example: "Successfully fetched enrolled courses" }
 *                 payload:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId: { type: integer, example: 1 }
 *                       title: { type: string, example: "Mastering React" }
 *                       description: { type: string }
 *                       ownedBy: { type: string }
 *                       coverUrl: { type: string }
 *                       category: { type: string, example: "Programming" }
 *                       duration: { type: integer }
 *                       enrolledAt: { type: string, format: "date-time" }
 *       401:
 *         description: Unauthorized
 */
router.get("/courses", verifyToken, getUserEnrolledCourses)

export default router
