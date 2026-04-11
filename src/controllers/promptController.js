import { db } from "../config/db.js"
import {  prompts } from "../db/schema.js"
import { eq, and, gte, asc, desc, sql, inArray } from "drizzle-orm"

export const getAllPrompts = async (req, res, next) => {
  try {
    const {
      page = 1,
      size = 10,
      category, 
      sort_field = "title",
      sort_order = "asc",
      min_vote,
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(size)
    const limit = parseInt(size)

    const filters = []

    if (category && category !== "null" && category !== "undefined") {
      const categoryList = category.split(",").map((c) => c.trim())
      if (categoryList.length > 0) {
        filters.push(inArray(prompts.category, categoryList))
      }
    }

    if (min_vote) {
      filters.push(gte(prompts.vote, parseInt(min_vote)))
    }

    const order =
      sort_order.toLowerCase() === "desc"
        ? desc(prompts[sort_field] || prompts.title)
        : asc(prompts[sort_field] || prompts.title)

    const data = await db.query.prompts.findMany({
      where: and(...filters),
      limit: limit,
      offset: offset,
      orderBy: [order],
    })

    const totalResult = await db
      .select({ count: sql`count(*)` })
      .from(prompts)
      .where(and(...filters))

    const total = parseInt(totalResult[0].count)

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: {
        page: parseInt(page),
        size: limit,
        total: total,
        data: data,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getPromptCategories = async (req, res, next) => {
  try {
    const result = await db
      .select({ category: prompts.category })
      .from(prompts)
      .groupBy(prompts.category)

    const categories = result.map((r) => r.category).filter(Boolean)

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: categories,
    })
  } catch (error) {
    next(error)
  }
}

export const getPromptById = async (req, res, next) => {
  try {
    const promptId = parseInt(req.params.id)
    const prompt = await db.query.prompts.findFirst({
      where: eq(prompts.promptId, promptId),
    })

    if (!prompt) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Prompt not found",
        payload: null,
      })
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Success",
      payload: prompt,
    })
  } catch (error) {
    next(error)
  }
}
