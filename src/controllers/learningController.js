import { eq, desc } from "drizzle-orm"
import { db } from "../config/db.js"
import { userCourses, courses } from "../db/schema.js"

export const getUserEnrolledCourses = async (req, res, next) => {
  try {
    const userId = req.user.userId

    // Join bảng userCourses và courses để lấy thông tin khóa học user đã mua
    const enrolledCourses = await db
      .select({
        courseId: courses.courseId,
        title: courses.title,
        description: courses.description,
        ownedBy: courses.ownedBy,
        coverUrl: courses.coverUrl,
        category: courses.category,
        duration: courses.duration,
        enrolledAt: userCourses.enrolledAt,
      })
      .from(userCourses)
      .innerJoin(courses, eq(userCourses.courseId, courses.courseId))
      .where(eq(userCourses.userId, userId))
      .orderBy(desc(userCourses.enrolledAt)) // Khóa học mới mua lên đầu

    res.status(200).json({
      success: true,
      code: 200,
      message: "Successfully fetched enrolled courses",
      payload: enrolledCourses,
    })
  } catch (error) {
    next(error)
  }
}
