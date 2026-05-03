import "dotenv/config"
import { defineConfig } from "drizzle-kit"
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in the .env file")
}
export default defineConfig({
  schema: "./src/db/schema.js", // Cập nhật lại đường dẫn chính xác này
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
