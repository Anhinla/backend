import express from "express"
import cors from "cors"
import dotenv from "dotenv"


import userRoutes from "./routes/userRoutes.js"
import courseRoutes from './routes/courseRoutes.js';
import promptRoutes from "./routes/promptRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import learningRoutes from "./routes/learningRoutes.js"

import { setupSwagger } from "./config/swagger.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000


app.use(cors())
app.use(express.json())


setupSwagger(app)


app.use("/api/users", userRoutes)
app.use('/api/courses', courseRoutes);
app.use("/api/prompts", promptRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/learning", learningRoutes)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: "Internal Server Error" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
