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

// 1. TẠO URL THANH TOÁN
router.post("/create-payment", async (req, res) => {
  const date = new Date()
  const createDate = moment(date).utcOffset("+07:00").format("YYYYMMDDHHmmss")
  const orderId = moment(date).utcOffset("+07:00").format("DDHHmmss")

  // Lấy IP, fallback về 127.0.0.1 y như code bạn của bạn
  let ipAddr =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
  if (ipAddr.includes(",")) {
    ipAddr = ipAddr.split(",")[0].trim()
  }

  // Khai báo Environment Variables (lọc sạch bằng .trim() đề phòng dư dấu cách)
  const tmnCode = process.env.VNP_TMNCODE?.trim() || ""
  const secretKey = process.env.VNP_HASHSECRET?.trim() || ""
  const endpoint =
    process.env.VNP_URL?.trim() ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  const returnUrl = process.env.VNP_RETURNURL?.trim() || ""

  const amount = Math.round(Number(req.body.amount))

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: (amount * 100).toString(),
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Payment for order ${orderId}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn", // Đổi sang "vn" cho giống code của bạn bạn
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  }

  // 1. Tạo chuỗi ký tự theo chuẩn Python
  const signData = buildSignData(params)

  // 2. Băm chuỗi bằng HMAC SHA512
  const hmac = crypto.createHmac("sha512", secretKey)
  const signature = hmac.update(Buffer.from(signData, "utf-8")).digest("hex")

  // 3. Đưa signature vào object và tạo URL cuối cùng
  params["vnp_SecureHash"] = signature
  const finalQuery = buildSignData(params)
  const paymentUrl = `${endpoint}?${finalQuery}`

  res.json({ paymentUrl: paymentUrl })
})

// 2. NHẬN KẾT QUẢ TỪ VNPAY (IPN)
router.get("/vnpay_ipn", async (req, res) => {
  const secretKey = process.env.VNP_HASHSECRET?.trim() || ""
  let vnp_Params = { ...req.query } // Tạo bản sao của query để không đụng tới object gốc
  const secureHash = vnp_Params["vnp_SecureHash"]

  // Xóa hash ra khỏi tham số để tính toán lại chữ ký
  delete vnp_Params["vnp_SecureHash"]
  delete vnp_Params["vnp_SecureHashType"]

  // DÙNG LẠI CHÍNH HÀM buildSignData ĐỂ ĐẢM BẢO KHỚP 100% VỚI LÚC GỬI
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

export default router
