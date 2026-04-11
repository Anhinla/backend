import jwt from "jsonwebtoken"

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. No token provided.",
      })
    }

    const token = authHeader.split(" ")[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    })
  }
}

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) {
    req.user = null
    return next()
  }

  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) 
    req.user = decoded
    next()
  } catch (error) {
    req.user = null
    next()
  }
}