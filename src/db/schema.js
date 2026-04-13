import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core"

// TABLES

export const users = pgTable("User", {
  userId: serial("userId").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
})

export const prompts = pgTable("Prompt", {
  promptId: serial("promptId").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverUrl: varchar("cover_url", { length: 500 }),
  category: varchar("category", { length: 100 }),
  contentUrl: varchar("content_url", { length: 500 }),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  vote: integer("vote").default(0),
  downloadCount: integer("download_count").default(0),
})

export const courses = pgTable("Course", {
  courseId: serial("courseId").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  ownedBy: varchar("owned_by", { length: 255 }),
  coverUrl: varchar("cover_url", { length: 500 }),
  category: varchar("category", { length: 100 }),
  price: numeric("price", { precision: 10, scale: 2 }).default("0"),
  vote: integer("vote").default(0),
  purchasedCount: integer("purchased_count").default(0),
  duration: integer("duration"),
})

export const lessons = pgTable("Lesson", {
  lessonId: serial("lessonId").primaryKey(),
  courseId: integer("courseId")
    .notNull()
    .references(() => courses.courseId, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  duration: integer("duration"),
  contentUrl: varchar("content_url", { length: 500 }),
})

export const orders = pgTable("Order", {
  orderId: serial("orderId").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).default("0"),
})

export const orderDetails = pgTable("OrderDetail", {
  orderDetailId: serial("orderDetailId").primaryKey(),
  orderId: integer("orderId")
    .notNull()
    .references(() => orders.orderId, { onDelete: "cascade" }),
  promptId: integer("promptId").references(() => prompts.promptId, {
    onDelete: "set null",
  }),
  courseId: integer("courseId").references(() => courses.courseId, {
    onDelete: "set null",
  }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1),
})

export const userCarts = pgTable(
  "UserCart",
  {
    userId: integer("userId")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    promptId: integer("promptId").references(() => prompts.promptId, {
      onDelete: "cascade",
    }),
    courseId: integer("courseId").references(() => courses.courseId, {
      onDelete: "cascade",
    }),
    quantity: integer("quantity").default(1),
  },
  (table) => {
    return {
      pkUserCart: unique("pk_usercart").on(
        table.userId,
        table.promptId,
        table.courseId,
      ),
    }
  },
)

export const userCourses = pgTable(
  "UserCourse",
  {
    userId: integer("userId")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    courseId: integer("courseId")
      .notNull()
      .references(() => courses.courseId, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolledAt").defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.courseId] }),
    }
  },
)

export const userLessons = pgTable(
  "UserLesson",
  {
    userId: integer("userId")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    lessonId: integer("lessonId")
      .notNull()
      .references(() => lessons.lessonId, { onDelete: "cascade" }),
    completed: boolean("completed").default(false),
    completedAt: timestamp("completedAt"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.lessonId] }),
    }
  },
)
