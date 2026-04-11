import { eq, and } from "drizzle-orm"

import {
  users,
  userCarts,
  courses,
  prompts,
  orders,
  orderDetails,
  userCourses,
} from "../db/schema.js"
import { db } from "../config/db.js"
import nodemailer from "nodemailer"

export const getUserCart = async (req, res, next) => {
  try {
    const userId = req.user.userId

    const rawCartItems = await db
      .select({
        cartQuantity: userCarts.quantity,
        courseId: userCarts.courseId,
        promptId: userCarts.promptId,

        courseTitle: courses.title,
        courseCategory: courses.category,
        coursePrice: courses.price,
        courseCoverUrl: courses.coverUrl,
        promptTitle: prompts.title,
        promptCategory: prompts.category,
        promptPrice: prompts.price,
        promptCoverUrl: prompts.coverUrl,
      })
      .from(userCarts)
      .leftJoin(courses, eq(userCarts.courseId, courses.courseId))
      .leftJoin(prompts, eq(userCarts.promptId, prompts.promptId))
      .where(eq(userCarts.userId, userId))

    const formattedCart = rawCartItems.map((item) => {
      if (item.courseId) {
        return {
          itemId: item.courseId,
          type: "course",
          title: item.courseTitle,
          category: item.courseCategory,
          price: Number(item.coursePrice) || 0,
          coverUrl: item.courseCoverUrl,
          quantity: item.cartQuantity,
        }
      }

      // Nếu item là prompt
      if (item.promptId) {
        return {
          itemId: item.promptId,
          type: "prompt",
          title: item.promptTitle,
          category: item.promptCategory,
          price: Number(item.promptPrice) || 0,
          coverUrl: item.promptCoverUrl,
          quantity: item.cartQuantity,
        }
      }
    })

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: formattedCart,
    })
  } catch (error) {
    next(error)
  }
}
export const addCart = async (req, res, next) => {
  try {
    const { courseId } = req.body
    const userId = req.user.userId

    const existingItem = await db.query.userCarts.findFirst({
      where: and(
        eq(userCarts.userId, userId),
        eq(userCarts.courseId, courseId),
      ),
    })

    if (existingItem) {
      await db
        .update(userCarts)
        .set({ quantity: existingItem.quantity + 1 })
        .where(
          and(eq(userCarts.userId, userId), eq(userCarts.courseId, courseId)),
        )
    } else {
      await db.insert(userCarts).values({
        userId: userId,
        courseId: courseId,
        quantity: 1,
      })
    }

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Add to cart successfully",
      payload: null,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteCourseCart = async (req, res, next) => {
  try {
    const { courseId } = req.params

    const userId = req.user.userId

    const numericCourseId = parseInt(courseId, 10)

    await db
      .delete(userCarts)
      .where(
        and(
          eq(userCarts.userId, userId),
          eq(userCarts.courseId, numericCourseId),
        ),
      )

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Delete item successfully",
      payload: null,
    })
  } catch (error) {
    next(error)
  }
}

export const processCheckout = async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { cardNumber } = req.body

    // 1. Lấy toàn bộ item trong giỏ hàng (join với Course và Prompt để lấy giá)
    const cartItems = await db
      .select({
        courseId: userCarts.courseId,
        promptId: userCarts.promptId,
        quantity: userCarts.quantity,
        coursePrice: courses.price,
        promptPrice: prompts.price,
      })
      .from(userCarts)
      .leftJoin(courses, eq(userCarts.courseId, courses.courseId))
      .leftJoin(prompts, eq(userCarts.promptId, prompts.promptId))
      .where(eq(userCarts.userId, userId))

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" })
    }

    // 2. Giả lập kiểm tra thẻ Stripe Sandbox
    if (!cardNumber || !cardNumber.startsWith("4242")) {
      return res.status(402).json({
        success: false,
        message:
          "Payment Failed. Please use card starting with 4242 for simulation.",
      })
    }

    // 3. Tính toán tổng tiền
    let totalAmount = 0
    const itemsToProcess = cartItems.map((item) => {
      const price = item.courseId
        ? Number(item.coursePrice)
        : Number(item.promptPrice)
      totalAmount += price * (item.quantity || 1)
      return { ...item, finalPrice: price }
    })

    // Thuế 10% như UI của bạn
    const finalTotal = totalAmount * 1.1

    // 4. Thực hiện Transaction
    await db.transaction(async (tx) => {
      // a. Tạo Order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          userId: userId,
          status: "completed",
          totalAmount: finalTotal.toFixed(2),
        })
        .returning()

      for (const item of itemsToProcess) {
        // b. Lưu chi tiết Order
        await tx.insert(orderDetails).values({
          orderId: newOrder.orderId,
          courseId: item.courseId,
          promptId: item.promptId,
          price: item.finalPrice.toFixed(2),
          quantity: item.quantity,
        })

        // c. Nếu là Course, cấp quyền sở hữu ngay (Insert vào UserCourse)
        if (item.courseId) {
          await tx
            .insert(userCourses)
            .values({
              userId: userId,
              courseId: item.courseId,
            })
            .onConflictDoNothing() // Nếu đã sở hữu thì bỏ qua
        }
      }

      // d. Xóa giỏ hàng
      await tx.delete(userCarts).where(eq(userCarts.userId, userId))
    })

    res.status(200).json({
      success: true,
      code: 200,
      message: "Purchase successful! Items added to your library.",
    })
  } catch (error) {
    next(error)
  }
}
import Stripe from "stripe"
const stripe = new Stripe(process.env.STRIPE_SECRET)

export const createPaymentIntent = async (req, res, next) => {
  try {
    const userId = req.user.userId
    // 1. Nhận email từ Frontend
    const { email } = req.body

    const cartItems = await db
      .select({
        courseId: userCarts.courseId,
        promptId: userCarts.promptId,
        quantity: userCarts.quantity,
        coursePrice: courses.price,
        promptPrice: prompts.price,
      })
      .from(userCarts)
      .leftJoin(courses, eq(userCarts.courseId, courses.courseId))
      .leftJoin(prompts, eq(userCarts.promptId, prompts.promptId))
      .where(eq(userCarts.userId, userId))

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" })
    }

    let totalAmount = 0
    cartItems.forEach((item) => {
      const price = item.courseId
        ? Number(item.coursePrice)
        : Number(item.promptPrice)
      totalAmount += price * (item.quantity || 1)
    })

    const finalTotal = totalAmount * 1.1

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalTotal * 100),
      currency: "usd",
      receipt_email: email,
      metadata: { userId: userId },
    })

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    next(error)
  }
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "huynhnguyenngocanh91thcsduclap@gmail.com",
    pass: "khvdwpxmoygiqfiv",
  },
})

export const confirmOrderSuccess = async (req, res, next) => {
  try {
    const userId = req.user.userId

    // Lấy giỏ hàng
    const cartItems = await db
      .select({
        courseId: userCarts.courseId,
        promptId: userCarts.promptId,
        quantity: userCarts.quantity,
        coursePrice: courses.price,
        promptPrice: prompts.price,
        courseTitle: courses.title,
        promptTitle: prompts.title,
      })
      .from(userCarts)
      .leftJoin(courses, eq(userCarts.courseId, courses.courseId))
      .leftJoin(prompts, eq(userCarts.promptId, prompts.promptId))
      .where(eq(userCarts.userId, userId))

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" })
    }

    let totalAmount = 0
    const itemsToProcess = cartItems.map((item) => {
      const price = item.courseId
        ? Number(item.coursePrice)
        : Number(item.promptPrice)
      totalAmount += price * (item.quantity || 1)
      return { ...item, finalPrice: price }
    })

    const finalTotal = totalAmount * 1.1 // Có thuế 10%

    // a. Tạo Order
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId: userId,
        status: "completed",
        totalAmount: finalTotal.toFixed(2),
      })
      .returning()

    const purchasedItems = []

    for (const item of itemsToProcess) {
      // b. Tạo OrderDetails
      await db.insert(orderDetails).values({
        orderId: newOrder.orderId,
        courseId: item.courseId,
        promptId: item.promptId,
        price: item.finalPrice.toFixed(2),
        quantity: item.quantity,
      })

      // Lưu format đẹp
      purchasedItems.push({
        id: item.courseId || item.promptId,
        type: item.courseId ? "course" : "prompt",
        title: item.courseId ? item.courseTitle : item.promptTitle,
        price: item.finalPrice,
        quantity: item.quantity,
      })

      // c. Cấp quyền
      if (item.courseId) {
        await db
          .insert(userCourses)
          .values({
            userId: userId,
            courseId: item.courseId,
          })
          .onConflictDoNothing()
      }
    }

    await db.delete(userCarts).where(eq(userCarts.userId, userId))

    try {
      const currentUser = await db.query.users.findFirst({
        where: eq(users.userId, userId),
      })

      if (currentUser && currentUser.email) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Payment Successful!</h2>
            <p>Hi ${currentUser.name},</p>
            <p>Thank you for your purchase. Here is your receipt for order <strong>#${newOrder.orderId}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f9f9f9; text-align: left;">
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Item</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd;">Type</th>
                  <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${purchasedItems
                  .map(
                    (i) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${i.title}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: capitalize;">${i.type}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${i.price.toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

            <div style="margin-top: 20px; text-align: right;">
              <p style="color: #666; margin: 5px 0;">Subtotal: $${totalAmount.toFixed(2)}</p>
              <p style="color: #666; margin: 5px 0;">Tax (10%): $${(totalAmount * 0.1).toFixed(2)}</p>
              <h3 style="color: #333; margin: 10px 0;">Total Paid: $${finalTotal.toFixed(2)}</h3>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
              If you have any questions, please reply to this email.
            </p>
          </div>
        `

        // Thực hiện gửi
        await transporter.sendMail({
          from: '"PromptWizzard Support" <your-email@gmail.com>', // Điền email của bạn
          to: currentUser.email, // Email của user
          subject: `Your receipt for Order #${newOrder.orderId}`,
          html: htmlContent,
        })
        console.log(`Receipt sent to ${currentUser.email}`)
      }
    } catch (mailError) {
      console.error("Failed to send receipt email:", mailError)
    }

    // Trả về response
    res.status(200).json({
      success: true,
      code: 200,
      message: "Order confirmed successfully!",
      payload: {
        orderId: newOrder.orderId,
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        createdAt: newOrder.createdAt,
        items: purchasedItems,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getCartCount = async (req, res, next) => {
  try {
    const userId = req.user.userId

    const cartItems = await db
      .select({
        quantity: userCarts.quantity,
      })
      .from(userCarts)
      .where(eq(userCarts.userId, userId))

    const totalCount = cartItems.reduce(
      (acc, item) => acc + (item.quantity || 1),
      0,
    )

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Cart count retrieved successfully",
      payload: { count: totalCount },
    })
  } catch (error) {
    next(error)
  }
}