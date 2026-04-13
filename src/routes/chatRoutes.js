import express from "express"
const router = express.Router()
import {handleChatbot} from "../controllers/chatController.js"
router.post("/", handleChatbot)

export default router