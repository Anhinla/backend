import express from "express"
import moment from "moment"
import crypto from "crypto"
import { eq } from "drizzle-orm"
import { db } from "../config/db.js"
import {
  orders,
  orderDetails,
  userCourses,
  transactions,
} from "../db/schema.js"

const router = express.Router()

// Hàm này mô phỏng CHÍNH XÁC logic của urllib.parse.urlencode() trong Python
function buildSignData(params) {
  const sortedKeys = Object.keys(params).sort()
  const signData = sortedKeys
    .map((key) => {
      const value = String(params[key])
      // Python's urlencode tự động chuyển dấu cách thành '+', JS encodeURIComponent dùng '%20'
      // Do đó ta dùng replace để ép JS hành xử giống hệt Python
      const encodedValue = encodeURIComponent(value).replace(/%20/g, "+")
      return `${key}=${encodedValue}`
    })
    .join("&")

  return signData
}


router.post("/create-payment", async (req, res, next) => {
  try {
    const userId = req.user.userId;
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
      .where(eq(userCarts.userId, userId));

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let totalAmount = 0;
    cartItems.forEach((item) => {
      const price = item.courseId ? Number(item.coursePrice) : Number(item.promptPrice);
      totalAmount += price * (item.quantity || 1);
    });

    const finalTotalUSD = totalAmount * 1.1;
    const exchangeRate = 25000; 
    const finalTotalVND = Math.round(finalTotalUSD * exchangeRate);

    // 2. TẠO URL VNPAY
    const date = new Date();
    const createDate = moment(date).utcOffset("+07:00").format("YYYYMMDDHHmmss");
    const orderId = moment(date).utcOffset("+07:00").format("DDHHmmss");

    let ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    if (ipAddr.includes(",")) ipAddr = ipAddr.split(",")[0].trim();

    const tmnCode = process.env.VNP_TMNCODE?.trim() || "";
    const secretKey = process.env.VNP_HASHSECRET?.trim() || "";
    const endpoint = process.env.VNP_URL?.trim() || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const returnUrl = process.env.VNP_RETURNURL?.trim() || "";

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: (finalTotalVND * 100).toString(), 
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Payment for order ${orderId}`,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const signData = buildSignData(params);
    const hmac = crypto.createHmac("sha512", secretKey);
    const signature = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    params["vnp_SecureHash"] = signature;
    const paymentUrl = `${endpoint}?${buildSignData(params)}`;

    res.json({ paymentUrl: paymentUrl });
  } catch (error) {
    next(error);
  }
});

router.get("/vnpay_ipn", async (req, res) => {
  const secretKey = process.env.VNP_HASHSECRET?.trim() || ""
  let vnp_Params = { ...req.query } 
  const secureHash = vnp_Params["vnp_SecureHash"]

  delete vnp_Params["vnp_SecureHash"]
  delete vnp_Params["vnp_SecureHashType"]

  const signData = buildSignData(vnp_Params)
  const hmac = crypto.createHmac("sha512", secretKey)
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex")

  if (secureHash === signed) {
    const vnp_TxnRef = vnp_Params["vnp_TxnRef"]
    const responseCode = vnp_Params["vnp_ResponseCode"]

    try {
      await db.transaction(async (tx) => {
        const orderRecord = await tx
          .select()
          .from(orders)
          .where(eq(orders.vnpTxnRef, vnp_TxnRef))
          .limit(1)

        if (orderRecord.length === 0) {
          throw new Error("Order not found")
        }

        const currentOrder = orderRecord[0]

        if (responseCode === "00") {
          await tx
            .update(orders)
            .set({ status: "success" })
            .where(eq(orders.orderId, currentOrder.orderId))

          await tx.insert(transactions).values({
            orderId: currentOrder.orderId,
            vnpayTransactionNo: vnp_Params["vnp_TransactionNo"],
            responseCode: responseCode,
            bankCode: vnp_Params["vnp_BankCode"],
            amount: (vnp_Params["vnp_Amount"] / 100).toString(),
            orderInfo: vnp_Params["vnp_OrderInfo"],
            status: "success",
          })

          const details = await tx
            .select()
            .from(orderDetails)
            .where(eq(orderDetails.orderId, currentOrder.orderId))

          const coursesToInsert = details
            .filter((d) => d.courseId !== null)
            .map((d) => ({
              userId: currentOrder.userId,
              courseId: d.courseId,
            }))

          if (coursesToInsert.length > 0) {
            await tx
              .insert(userCourses)
              .values(coursesToInsert)
              .onConflictDoNothing()
          }

          res.status(200).json({ RspCode: "00", Message: "Success" })
        } else {
          await tx
            .update(orders)
            .set({ status: "failed" })
            .where(eq(orders.orderId, currentOrder.orderId))

          await tx.insert(transactions).values({
            orderId: currentOrder.orderId,
            vnpayTransactionNo: vnp_Params["vnp_TransactionNo"] || null,
            responseCode: responseCode,
            bankCode: vnp_Params["vnp_BankCode"] || null,
            amount: (vnp_Params["vnp_Amount"] / 100).toString(),
            orderInfo: vnp_Params["vnp_OrderInfo"],
            status: "failed",
          })

          res.status(200).json({ RspCode: "00", Message: "Success" })
        }
      })
    } catch (error) {
      console.error("IPN update error:", error)
      res.status(200).json({ RspCode: "99", Message: "Unknown error" })
    }
  } else {
    console.error("Checksum failed at IPN!")
    res.status(200).json({ RspCode: "97", Message: "Fail checksum" })
  }
})

// Import Nodemailer và config transporter y như file Stripe
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "huynhnguyenngocanh91thcsduclap@gmail.com",
    pass: "khvdwpxmoygiqfiv",
  },
});


router.get("/vnpay_return", async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const signData = buildSignData(vnp_Params);
    const secretKey = process.env.VNP_HASHSECRET?.trim() || "";
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash !== signed) {
      return res.status(200).json({ success: false, message: "Invalid signature" });
    }

    const responseCode = vnp_Params["vnp_ResponseCode"];
    if (responseCode !== "00") {
      return res.status(200).json({ success: false, message: "Transaction failed or canceled" });
    }

    // ==========================================
    // BẮT ĐẦU LOGIC CỦA CONFIRM ORDER SUCCESS
    // ==========================================

    // 1. Fetch Cart
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
      .where(eq(userCarts.userId, userId));

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let totalAmountUSD = 0;
    const itemsToProcess = cartItems.map((item) => {
      const price = item.courseId ? Number(item.coursePrice) : Number(item.promptPrice);
      totalAmountUSD += price * (item.quantity || 1);
      return { ...item, finalPrice: price };
    });

    const finalTotalUSD = totalAmountUSD * 1.1;

    // 2. Xử lý Database Transaction
    let purchasedItems = [];
    let newOrder;

    await db.transaction(async (tx) => {
      [newOrder] = await tx
        .insert(orders)
        .values({
          userId: userId,
          status: "completed",
          vnpTxnRef: vnp_Params["vnp_TxnRef"], // Lưu mã giao dịch của VNPay
          totalAmount: finalTotalUSD.toFixed(2), // Vẫn lưu USD cho đồng nhất database
        })
        .returning();

      for (const item of itemsToProcess) {
        await tx.insert(orderDetails).values({
          orderId: newOrder.orderId,
          courseId: item.courseId,
          promptId: item.promptId,
          price: item.finalPrice.toFixed(2),
          quantity: item.quantity,
        });

        purchasedItems.push({
          id: item.courseId || item.promptId,
          type: item.courseId ? "course" : "prompt",
          title: item.courseId ? item.courseTitle : item.promptTitle,
          price: item.finalPrice,
          quantity: item.quantity,
        });

        if (item.courseId) {
          await tx.insert(userCourses).values({ userId: userId, courseId: item.courseId }).onConflictDoNothing();
        }
      }

      await tx.delete(userCarts).where(eq(userCarts.userId, userId));
    });

    // 3. Gửi Email Receipt
    try {
      const currentUser = await db.query.users.findFirst({ where: eq(users.userId, userId) });

      if (currentUser && currentUser.email) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">VNPay Payment Successful!</h2>
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
                ${purchasedItems.map((i) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${i.title}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-transform: capitalize;">${i.type}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${i.price.toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div style="margin-top: 20px; text-align: right;">
              <p style="color: #666; margin: 5px 0;">Subtotal: $${totalAmountUSD.toFixed(2)}</p>
              <p style="color: #666; margin: 5px 0;">Tax (10%): $${(totalAmountUSD * 0.1).toFixed(2)}</p>
              <h3 style="color: #333; margin: 10px 0;">Total Paid: $${finalTotalUSD.toFixed(2)}</h3>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: '"PromptWizzard Support" <huynhnguyenngocanh91thcsduclap@gmail.com>',
          to: currentUser.email,
          subject: `Your receipt for Order #${newOrder.orderId}`,
          html: htmlContent,
        });
      }
    } catch (mailError) {
      console.error("Failed to send receipt email:", mailError);
    }

    // 4. Trả về Frontend để nó hiện trang Success
    return res.status(200).json({
      success: true,
      message: "Order confirmed successfully!",
      payload: {
        orderId: newOrder.orderId,
        totalAmount: newOrder.totalAmount,
        status: newOrder.status,
        items: purchasedItems,
      },
    });

  } catch (error) {
    next(error);
  }
});
export default router
