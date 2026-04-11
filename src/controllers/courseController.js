import { db } from "../config/db.js"
import {
  courses,
  userCarts,
  userCourses,
  lessons,
  userLessons,
} from "../db/schema.js"
import { eq, and, gte, asc, desc, sql, inArray } from "drizzle-orm"

export const getAllCourses = async (req, res, next) => {
  try {
    const {
      page = 1,
      size = 10,
      category,
      sort_field = "title",
      sort_order = "asc",
      min_vote,
    } = req.query

    const userId = req.user?.userId

    const offset = (parseInt(page) - 1) * parseInt(size)
    const limit = parseInt(size)

    const filters = []

    if (category && category !== "null" && category !== "undefined") {
      const categoryList = category.split(",").map((c) => c.trim())
      if (categoryList.length > 0) {
        filters.push(inArray(courses.category, categoryList))
      }
    }

    if (min_vote) {
      filters.push(gte(courses.vote, parseInt(min_vote)))
    }

    const order =
      sort_order.toLowerCase() === "desc"
        ? desc(courses[sort_field] || courses.title)
        : asc(courses[sort_field] || courses.title)

    const rawData = await db
      .select({
        course: courses,
        cartCourseId: userCarts.courseId,
        ownedCourseId: userCourses.courseId,
      })
      .from(courses)
      .leftJoin(
        userCarts,
        and(
          eq(courses.courseId, userCarts.courseId),
          userId ? eq(userCarts.userId, userId) : sql`false`,
        ),
      )
      .leftJoin(
        userCourses,
        and(
          eq(courses.courseId, userCourses.courseId),
          userId ? eq(userCourses.userId, userId) : sql`false`,
        ),
      )
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(order)

    const enrichedData = rawData.map((row) => ({
      ...row.course,
      isInCart: !!row.cartCourseId,
      isOwned: !!row.ownedCourseId,
    }))

    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(courses)
      .where(and(...filters))

    const total = parseInt(totalResult[0].count)

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: {
        page: parseInt(page),
        size: limit,
        total: total,
        data: enrichedData,
      },
    })
  } catch (error) {
    next(error)
  }
}
export const getCourseCategories = async (req, res, next) => {
  try {
    const result = await db
      .select({ category: courses.category })
      .from(courses)
      .groupBy(courses.category)

    const categories = result.map((r) => r.category).filter(Boolean)

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: categories,
    })
  } catch (error) {
    next(error)
  }
}

export const getCourseById = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id)
    const userId = req.user?.userId

    // Guard against invalid IDs turning into NaN
    if (isNaN(courseId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid course ID format" })
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.courseId, courseId),
    })

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" })
    }

    let isInCart = false
    let isOwned = false

    if (userId) {
      // Check giỏ hàng
      const cartItem = await db.query.userCarts.findFirst({
        where: and(
          eq(userCarts.userId, userId),
          eq(userCarts.courseId, courseId),
        ),
      })
      if (cartItem) isInCart = true

      const owned = await db.query.userCourses.findFirst({
        where: and(
          eq(userCourses.userId, userId),
          eq(userCourses.courseId, courseId),
        ),
      })
      if (owned) isOwned = true
    }

    res.status(200).json({
      success: true,
      code: 200,
      payload: {
        ...course,
        isInCart,
        isOwned,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Thêm hàm này vào file courseController.js
export const getAllOwnedCourses = async (req, res, next) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login",
      })
    }

    // Join bảng userCourses với bảng courses để lấy thông tin chi tiết
    const rawData = await db
      .select({
        course: courses,
        enrolledAt: userCourses.enrolledAt,
      })
      .from(userCourses)
      .innerJoin(courses, eq(userCourses.courseId, courses.courseId))
      .where(eq(userCourses.userId, userId))
      .orderBy(desc(userCourses.enrolledAt)) // Sắp xếp khoá học mới mua lên đầu

    // Trải phẳng (flatten) object trả về cho Frontend dễ dùng
    const enrichedData = rawData.map((row) => ({
      ...row.course,
      enrolledAt: row.enrolledAt,
      isOwned: true, // Chắc chắn là true vì nằm trong danh sách owned
    }))

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: enrichedData, // Trả về mảng các khóa học
    })
  } catch (error) {
    next(error)
  }
}

export const getCourseLearningDetail = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id)
    const userId = req.user?.userId

    if (isNaN(courseId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid course ID" })
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    // 1. Kiểm tra xem User đã sở hữu (mua) khóa học này chưa
    const isOwned = await db.query.userCourses.findFirst({
      where: and(
        eq(userCourses.courseId, courseId),
        eq(userCourses.userId, userId),
      ),
    })

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You have not purchased this course.",
      })
    }

    // 2. Lấy thông tin chung của khóa học
    const course = await db.query.courses.findFirst({
      where: eq(courses.courseId, courseId),
    })

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" })
    }

    // 3. Lấy tất cả bài học của khóa học này
    const allLessons = await db.query.lessons.findMany({
      where: eq(lessons.courseId, courseId),
      orderBy: [asc(lessons.lessonId)], // Sắp xếp theo thứ tự bài học
    })

    // 4. Lấy tiến trình học tập của User cho các bài học này
    let completedLessonIds = new Set()

    if (allLessons.length > 0) {
      const lessonIds = allLessons.map((l) => l.lessonId)

      const userProgress = await db.query.userLessons.findMany({
        where: and(
          eq(userLessons.userId, userId),
          inArray(userLessons.lessonId, lessonIds),
        ),
      })

      // Lọc ra ID của các bài học đã có trạng thái completed = true
      userProgress.forEach((progress) => {
        if (progress.completed) {
          completedLessonIds.add(progress.lessonId)
        }
      })
    }

    // 5. Gắn trạng thái isCompleted vào từng bài học
    const enrichedLessons = allLessons.map((lesson) => ({
      ...lesson,
      isCompleted: completedLessonIds.has(lesson.lessonId),
    }))

    // 6. Tính toán thống kê chung
    const totalLessonsCount = allLessons.length
    const completedLessonsCount = completedLessonIds.size
    const progressPercentage =
      totalLessonsCount === 0
        ? 0
        : Math.round((completedLessonsCount / totalLessonsCount) * 100)

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: {
        ...course,
        progressPercentage,
        completedLessonsCount,
        totalLessonsCount,
        lessons: enrichedLessons,
      },
    })
  } catch (error) {
    next(error)
  }
}