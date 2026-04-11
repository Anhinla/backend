import { db } from "../config/db.js"
import { users } from "../db/schema.js"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// SIGNUP
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Email is already in use!",
        payload: null,
      })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({
        userId: users.userId,
        name: users.name,
        email: users.email,
      })

    res.status(201).json({
      success: true,
      code: 201,
      message: "Signup successful!",
      payload: newUser[0],
    })
  } catch (error) {
    next(error)
  }
}

// LOGIN
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid email or password!",
        payload: null,
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid email or password!",
        payload: null,
      })
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    )

    const { password: _, ...userData } = user

    res.status(200).json({
      success: true,
      code: 200,
      message: "Login successful!",
      payload: {
        user: userData,
        token: token,
      },
    })
  } catch (error) {
    next(error)
  }
}
