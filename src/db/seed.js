// src/db/seed.js
import "dotenv/config"
import { db } from "../config/db.js"
import { courses, prompts, lessons } from "./schema.js"

const mockCourses = [
  {
    title: "Mastering Midjourney V6",
    description:
      "Learn advanced prompting techniques to create photorealistic images, consistent characters, and cinematic lighting.",
    category: "AI Art",
    price: "49.99",
    duration: 180,
    coverUrl: "https://picsum.photos/seed/midjourney/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "ChatGPT for Copywriters",
    description:
      "Train ChatGPT on your brand voice and generate high-converting sales pages and email sequences.",
    category: "Marketing",
    price: "39.99",
    duration: 120,
    coverUrl: "https://picsum.photos/seed/copywriting/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "Prompt Engineering Bootcamp",
    description:
      "The ultimate guide to structuring prompts, utilizing few-shot learning, and bypassing AI hallucinations.",
    category: "Prompt Engineering",
    price: "79.99",
    duration: 360,
    coverUrl: "https://picsum.photos/seed/engineering/600/400",
    ownedBy: "AI Institute",
  },
  {
    title: "Stable Diffusion LoRA Training",
    description:
      "Deep dive into training your own custom AI models and LoRAs for highly specific image generation.",
    category: "AI Art",
    price: "89.00",
    duration: 240,
    coverUrl: "https://picsum.photos/seed/diffusion/600/400",
    ownedBy: "TechVision",
  },
  {
    title: "AI for Data Analysts",
    description:
      "Use Code Interpreter and Claude to clean data, generate SQL, and create Python visualizations.",
    category: "Data Science",
    price: "55.00",
    duration: 150,
    coverUrl: "https://picsum.photos/seed/analytics/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "Automating SEO with AI",
    description:
      "Build programmatic SEO strategies and generate topical maps using advanced API prompting.",
    category: "Marketing",
    price: "65.00",
    duration: 200,
    coverUrl: "https://picsum.photos/seed/seo_pro/600/400",
    ownedBy: "GrowthHackers",
  },
  {
    title: "AI-Powered Game Development",
    description:
      "Use AI to generate game assets, write C# scripts, and brainstorm branching narrative storylines.",
    category: "Game Dev",
    price: "45.00",
    duration: 160,
    coverUrl: "https://picsum.photos/seed/gaming/600/400",
    ownedBy: "IndieStudios",
  },
  {
    title: "Claude 3 for Academics",
    description:
      "Techniques for literature reviews, synthesizing research papers, and structuring academic essays.",
    category: "Education",
    price: "29.00",
    duration: 90,
    coverUrl: "https://picsum.photos/seed/study/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "Building Custom GPTs",
    description:
      "Step-by-step guide to creating, deploying, and monetizing your own custom GPTs on the OpenAI store.",
    category: "Business",
    price: "59.99",
    duration: 210,
    coverUrl: "https://picsum.photos/seed/gpt_store/600/400",
    ownedBy: "AI Entrepreneurs",
  },
  {
    title: "AI Video Generation Basics",
    description:
      "Introduction to Runway Gen-2 and Sora. Prompt for consistent motion and cinematic camera angles.",
    category: "Video Production",
    price: "34.99",
    duration: 110,
    coverUrl: "https://picsum.photos/seed/cinema/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "AI for Financial Modeling",
    description:
      "Leverage LLMs to analyze financial statements, predict trends, and automate reporting workflows.",
    category: "Finance",
    price: "99.00",
    duration: 220,
    coverUrl: "https://picsum.photos/seed/finance/600/400",
    ownedBy: "WallStreetAI",
  },
  {
    title: "The AI Artist's Portfolio",
    description:
      "How to showcase and sell your AI-generated art on marketplaces and social media platforms.",
    category: "Career",
    price: "15.00",
    duration: 80,
    coverUrl: "https://picsum.photos/seed/artist/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "Generative AI for Legal Professionals",
    description:
      "Ethics, prompt security, and drafting legal documents with precision using Claude and GPT-4.",
    category: "Legal",
    price: "120.00",
    duration: 140,
    coverUrl: "https://picsum.photos/seed/law/600/400",
    ownedBy: "LegalAI Lab",
  },
  {
    title: "AI-Enhanced Social Media Growth",
    description:
      "Create a 30-day content calendar in minutes and use AI to optimize hooks for maximum reach.",
    category: "Social Media",
    price: "25.00",
    duration: 100,
    coverUrl: "https://picsum.photos/seed/viral/600/400",
    ownedBy: "InfluenceAI",
  },
  {
    title: "No-Code AI App Builder",
    description:
      "Build functional web apps by connecting OpenAI APIs with tools like Bubble and FlutterFlow.",
    category: "Software",
    price: "69.00",
    duration: 280,
    coverUrl: "https://picsum.photos/seed/nocode/600/400",
    ownedBy: "BuildFast",
  },
  {
    title: "AI for Real Estate Agents",
    description:
      "Generate property descriptions, virtual staging prompts, and automated lead follow-ups.",
    category: "Real Estate",
    price: "40.00",
    duration: 120,
    coverUrl: "https://picsum.photos/seed/house/600/400",
    ownedBy: "AgentTools",
  },
  {
    title: "Voice AI & Synthetic Media",
    description:
      "Master ElevenLabs and Murf to create professional voiceovers and synthetic podcasts.",
    category: "Audio",
    price: "30.00",
    duration: 90,
    coverUrl: "https://picsum.photos/seed/voice/600/400",
    ownedBy: "PromptWizard Academy",
  },
  {
    title: "Advanced LangChain Workflows",
    description:
      "Integrate LLMs with external data sources to build autonomous agents and RAG systems.",
    category: "Development",
    price: "110.00",
    duration: 400,
    coverUrl: "https://picsum.photos/seed/langchain/600/400",
    ownedBy: "CodeNinja",
  },
  {
    title: "Personal Productivity with AI",
    description:
      "Optimize your Notion, Obsidian, and Email workflows using AI shortcuts and automation.",
    category: "Productivity",
    price: "19.00",
    duration: 70,
    coverUrl: "https://picsum.photos/seed/productivity/600/400",
    ownedBy: "LifeHack AI",
  },
  {
    title: "AI for Product Managers",
    description:
      "Write PRDs, user stories, and conduct competitive research using structured AI workflows.",
    category: "Management",
    price: "55.00",
    duration: 160,
    coverUrl: "https://picsum.photos/seed/manager/600/400",
    ownedBy: "ProductAI",
  },
]

const mockPrompts = [
  {
    title: "Ultimate B2B Cold Email",
    description: "A 5-step sequence to bypass spam filters.",
    category: "Sales",
    price: "9.99",
    coverUrl: "https://picsum.photos/seed/email1/400/400",
    contentUrl: "https://example.com/p1",
    vote: 342,
    downloadCount: 1250,
  },
  {
    title: "Cyberpunk Cityscape V6",
    description: "Hyper-detailed neon environments in 8K.",
    category: "AI Art",
    price: "4.50",
    coverUrl: "https://picsum.photos/seed/cyber1/400/400",
    contentUrl: "https://example.com/p2",
    vote: 856,
    downloadCount: 3100,
  },
  {
    title: "Senior React Developer Persona",
    description: "Turns ChatGPT into a refactoring expert.",
    category: "Coding",
    price: "0",
    coverUrl: "https://picsum.photos/seed/code1/400/400",
    contentUrl: "https://example.com/p3",
    vote: 1205,
    downloadCount: 8500,
  },
  {
    title: "Product Description Factory",
    description: "Generate SEO-rich Shopify descriptions.",
    category: "E-commerce",
    price: "7.99",
    coverUrl: "https://picsum.photos/seed/shop1/400/400",
    contentUrl: "https://example.com/p4",
    vote: 210,
    downloadCount: 890,
  },
  {
    title: "Viral Twitter Thread Creator",
    description: "Framework for 10-part engaging threads.",
    category: "Social Media",
    price: "5.00",
    coverUrl: "https://picsum.photos/seed/social1/400/400",
    contentUrl: "https://example.com/p5",
    vote: 450,
    downloadCount: 2200,
  },
  {
    title: "Modern UI/UX App Concepts",
    description: "Glassmorphism and Neumorphism styles.",
    category: "Design",
    price: "6.50",
    coverUrl: "https://picsum.photos/seed/design1/400/400",
    contentUrl: "https://example.com/p6",
    vote: 630,
    downloadCount: 1800,
  },
  {
    title: "Legal Contract Drafter",
    description: "Draft NDAs and service agreements.",
    category: "Business",
    price: "12.00",
    coverUrl: "https://picsum.photos/seed/law1/400/400",
    contentUrl: "https://example.com/p7",
    vote: 180,
    downloadCount: 650,
  },
  {
    title: "SQL Performance Tuner",
    description: "Analyze and optimize slow queries.",
    category: "Coding",
    price: "0",
    coverUrl: "https://picsum.photos/seed/sql1/400/400",
    contentUrl: "https://example.com/p8",
    vote: 890,
    downloadCount: 4100,
  },
  {
    title: "Fantasy World-Building Bible",
    description: "Generate lore and magic systems.",
    category: "Writing",
    price: "8.50",
    coverUrl: "https://picsum.photos/seed/world1/400/400",
    contentUrl: "https://example.com/p9",
    vote: 520,
    downloadCount: 1400,
  },
  {
    title: "Interview Prep Simulator",
    description: "STAR method behavioral interview feedback.",
    category: "Career",
    price: "3.99",
    coverUrl: "https://picsum.photos/seed/job1/400/400",
    contentUrl: "https://example.com/p10",
    vote: 275,
    downloadCount: 1100,
  },
  {
    title: "Food Photography Masterclass",
    description: "Hyper-realistic culinary imagery.",
    category: "AI Art",
    price: "4.99",
    coverUrl: "https://picsum.photos/seed/food1/400/400",
    contentUrl: "https://example.com/p11",
    vote: 310,
    downloadCount: 950,
  },
  {
    title: "Personalized Workout Coach",
    description: "Dynamic 4-week fitness plans.",
    category: "Health",
    price: "0",
    coverUrl: "https://picsum.photos/seed/gym1/400/400",
    contentUrl: "https://example.com/p12",
    vote: 1500,
    downloadCount: 9200,
  },
  {
    title: "Cinematic Drone Shots",
    description: "FPV drone fly-through video prompts.",
    category: "Video Production",
    price: "15.00",
    coverUrl: "https://picsum.photos/seed/drone1/400/400",
    contentUrl: "https://example.com/p13",
    vote: 85,
    downloadCount: 320,
  },
  {
    title: "Regex Pattern Builder",
    description: "Match text with plain English descriptions.",
    category: "Coding",
    price: "0",
    coverUrl: "https://picsum.photos/seed/regex1/400/400",
    contentUrl: "https://example.com/p14",
    vote: 740,
    downloadCount: 5600,
  },
  {
    title: "SaaS Landing Page Copy",
    description: "Direct-response Hero and CTA generator.",
    category: "Marketing",
    price: "19.99",
    coverUrl: "https://picsum.photos/seed/saas1/400/400",
    contentUrl: "https://example.com/p15",
    vote: 195,
    downloadCount: 580,
  },
  {
    title: "Agile Scrum Master AI",
    description: "Write tickets and acceptance criteria.",
    category: "Business",
    price: "6.50",
    coverUrl: "https://picsum.photos/seed/agile1/400/400",
    contentUrl: "https://example.com/p16",
    vote: 140,
    downloadCount: 420,
  },
  {
    title: "IELTS Speaking Examiner",
    description: "Simulate tests and get band estimates.",
    category: "Education",
    price: "2.99",
    coverUrl: "https://picsum.photos/seed/english1/400/400",
    contentUrl: "https://example.com/p17",
    vote: 480,
    downloadCount: 1900,
  },
  {
    title: "D&D Dungeon Master",
    description: "Combat encounters and NPC dialogue.",
    category: "Gaming",
    price: "3.50",
    coverUrl: "https://picsum.photos/seed/dnd1/400/400",
    contentUrl: "https://example.com/p18",
    vote: 610,
    downloadCount: 2400,
  },
  {
    title: "Isometric 3D Icons",
    description: "Consistent 3D icons for websites.",
    category: "Design",
    price: "5.50",
    coverUrl: "https://picsum.photos/seed/icon1/400/400",
    contentUrl: "https://example.com/p19",
    vote: 390,
    downloadCount: 1200,
  },
  {
    title: "AWS Architecture Reviewer",
    description: "Identify security flaws and cost optimizations.",
    category: "DevOps",
    price: "14.99",
    coverUrl: "https://picsum.photos/seed/cloud1/400/400",
    contentUrl: "https://example.com/p20",
    vote: 110,
    downloadCount: 350,
  },
]

async function seedData() {
  console.log("🌱 Starting the database seeding process...")
  try {
    console.log("🧹 Clearing old data...")
    // Xoá bảng con trước để tránh lỗi khoá ngoại
    await db.delete(lessons)
    await db.delete(courses)
    await db.delete(prompts)
    console.log("✅ Old data cleared!")

    console.log("⏳ Inserting Courses...")
    // Dùng returning để lấy thông tin các course vừa được insert
    const insertedCourses = await db
      .insert(courses)
      .values(mockCourses)
      .returning({ courseId: courses.courseId, title: courses.title })

    console.log(`✅ Successfully inserted ${insertedCourses.length} courses!`)

    console.log("⏳ Generating and Inserting Lessons...")
    const mockLessons = []

    // Tự động tạo bài học cho từng khoá học
    for (const course of insertedCourses) {
      // Giả sử mỗi khoá học có 4 bài học
      for (let i = 1; i <= 4; i++) {
        mockLessons.push({
          courseId: course.courseId,
          title: `Lesson ${i}: Introduction to ${course.title.substring(0, 15)}...`,
          description: `Detailed description for lesson ${i} covering key concepts.`,
          category: i % 2 === 0 ? "Video" : "Reading",
          duration: 15 + i * 5,
          contentUrl: `https://example.com/lesson/video${i}.mp4`,
        })
      }
    }

    await db.insert(lessons).values(mockLessons)
    console.log(`✅ Successfully inserted ${mockLessons.length} lessons!`)

    console.log("⏳ Inserting Prompts...")
    await db.insert(prompts).values(mockPrompts)
    console.log(`✅ Successfully inserted ${mockPrompts.length} prompts!`)

    console.log("🎉 Seeding completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during seeding:", error)
    process.exit(1)
  }
}

seedData()
