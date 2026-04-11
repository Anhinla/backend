import { eq, and, desc } from "drizzle-orm"
import { db } from "../config/db.js"
import { orders, orderDetails, courses, prompts } from "../db/schema.js"

// 1. API Lấy danh sách tất cả các đơn hàng của User
export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId

    // Truy vấn danh sách order, sắp xếp ngày tạo mới nhất lên đầu
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))

    res.status(200).json({
      success: true,
      code: 200,
      message: "Successfully fetched user orders",
      payload: userOrders,
    })
  } catch (error) {
    next(error)
  }
}

// 2. API Lấy thông tin chi tiết của một Đơn hàng cụ thể (gồm danh sách các items)
export const getOrderById = async (req, res, next) => {
  try {
    const userId = req.user.userId
    const orderId = parseInt(req.params.id, 10)

    // Bước 1: Lấy thông tin cơ bản của Order và verify xem order này có phải của User đang login không
    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderId, orderId),
          eq(orders.userId, userId), // Đảm bảo user chỉ xem được order của chính mình
        ),
      )

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Order not found or you don't have permission to view it",
        payload: null,
      })
    }

    // Bước 2: Lấy chi tiết các OrderDetails (Join với bảng courses và prompts để lấy Tên, Hình ảnh, Category)
    const rawOrderItems = await db
      .select({
        orderDetailId: orderDetails.orderDetailId,
        priceAtPurchase: orderDetails.price,
        quantity: orderDetails.quantity,

        // Cột của Course
        courseId: courses.courseId,
        courseTitle: courses.title,
        courseCoverUrl: courses.coverUrl,
        courseCategory: courses.category,

        // Cột của Prompt
        promptId: prompts.promptId,
        promptTitle: prompts.title,
        promptCoverUrl: prompts.coverUrl,
        promptCategory: prompts.category,
      })
      .from(orderDetails)
      .leftJoin(courses, eq(orderDetails.courseId, courses.courseId))
      .leftJoin(prompts, eq(orderDetails.promptId, prompts.promptId))
      .where(eq(orderDetails.orderId, orderId))

    // Bước 3: Format lại dữ liệu cho đẹp và dễ sử dụng ở Frontend
    const formattedItems = rawOrderItems.map((item) => {
      // Nếu item là khóa học
      if (item.courseId) {
        return {
          id: item.courseId,
          type: "course",
          title: item.courseTitle,
          coverUrl: item.courseCoverUrl,
          category: item.courseCategory,
          price: Number(item.priceAtPurchase),
          quantity: item.quantity,
        }
      }

      // Nếu item là prompt
      if (item.promptId) {
        return {
          id: item.promptId,
          type: "prompt",
          title: item.promptTitle,
          coverUrl: item.promptCoverUrl,
          category: item.promptCategory,
          price: Number(item.priceAtPurchase),
          quantity: item.quantity,
        }
      }
    })

    // Bước 4: Trả về payload tổng hợp
    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: {
        ...order,
        items: formattedItems,
      },
    })
  } catch (error) {
    next(error)
  }
}
