import express from "express"
import moment from "moment"
import crypto from "crypto"
import querystring from "qs"
import { eq } from "drizzle-orm"
import { db } from "../config/db.js"
import {
  orders,
  orderDetails,
  userCourses,
  transactions,
} from "../db/schema.js"

const router = express.Router()

function sortObject(obj) {
  let sorted = {}
  let str = []
  let key
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key))
    }
  }
  str.sort()
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+")
  }
  return sorted
}

router.post("/create-payment", async (req, res) => {
  const date = new Date()
  const createDate = moment(date).format("YYYYMMDDHHmmss")
  const ipAddr =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1" // Fix nhẹ đề phòng ipAddr bị undefined

  const tmnCode = process.env.VNP_TMNCODE
  const secretKey = process.env.VNP_HASHSECRET
  let vnpUrl = process.env.VNP_URL
  const returnUrl = process.env.VNP_RETURNURL

  const orderId = moment(date).format("DDHHmmss")
  const amount = req.body.amount

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "en",
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Payment for order ${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  }

  vnp_Params = sortObject(vnp_Params)

  const signData = querystring.stringify(vnp_Params, { encode: false })
  const hmac = crypto.createHmac("sha512", secretKey)
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex")

  vnp_Params["vnp_SecureHash"] = signed
  vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false })

  res.json({ paymentUrl: vnpUrl })
})

router.get("/vnpay_ipn", async (req, res) => {
  let vnp_Params = req.query
  const secureHash = vnp_Params["vnp_SecureHash"]

  delete vnp_Params["vnp_SecureHash"]
  delete vnp_Params["vnp_SecureHashType"]

  vnp_Params = Object.keys(vnp_Params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = vnp_Params[key]
      return obj
    }, {})

  const secretKey = process.env.VNP_HASHSECRET
  const signData = querystring.stringify(vnp_Params, { encode: false })
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
    res.status(200).json({ RspCode: "97", Message: "Fail checksum" })
  }
})

export default router
