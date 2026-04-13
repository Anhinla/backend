import { db } from "../config/db.js"
import { courses } from "../db/schema.js"
import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const handleChatbot = async (req, res, next) => {
  try {
    const { message, chatHistory } = req.body
    const availableCourses = await db
      .select({
        courseId: courses.courseId, 
        title: courses.title,
        description: courses.description,
        category: courses.category,
        price: courses.price,
      })
      .from(courses)

    
    const coursesContext = JSON.stringify(availableCourses, null, 2)

    const systemInstruction = `
  You are the friendly, expert assistant for "The AI Wizard", an e-commerce website that sells premium prompting courses and free AI prompts.
  
  Your tasks:
  1. Recommend appropriate courses based on the user's needs.
  2. Help users format, refine, and improve their raw prompts to get better results from AI.
  
  Here is the list of available courses:
  ${JSON.stringify(availableCourses)}
  
  CRITICAL INSTRUCTION FOR COURSE RECOMMENDATIONS:
  Whenever you mention or recommend a course, you MUST provide a clickable Markdown link using this exact format: 
  [Course Title](/courses/COURSE_ID)
  (Replace COURSE_ID with the actual courseId from the data provided).
  Example: [ChatGPT for Copywriters](/courses/1)
`
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.type === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }))

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, 
      },
    })

    res.status(200).json({
      success: true,
      reply: response.text,
    })
  } catch (error) {
    console.error("Chatbot Error:", error)
    res
      .status(500)
      .json({ success: false, message: "AI is currently resting." })
  }
}
