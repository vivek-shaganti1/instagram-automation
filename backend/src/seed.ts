import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with demo Reels and analytics...");

  // Clear existing data
  await prisma.reel.deleteMany();
  await prisma.dailyMetric.deleteMany();

  // Seed demo daily metrics for the past 10 days (exponential growth)
  const baseTarget = 100;
  const growthRate = 0.15;
  
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    const dateStr = d.toISOString().split("T")[0];

    const targetViews = Math.floor(baseTarget * Math.pow(1 + growthRate, i));
    // Actual views slightly above target to show positive progression
    const totalViews = Math.floor(targetViews * (1 + (Math.random() * 0.15 + 0.05)));

    await prisma.dailyMetric.create({
      data: {
        date: dateStr,
        totalViews,
        targetViews,
        postCount: 3
      }
    });
  }

  // Seed demo posted Reels
  const categories = ["ai", "business", "motivation"];
  const headlines = [
    "This AI Replaces Photoshop Instantly",
    "How to Make $100/Day with Canva",
    "Consistency Always Defeats Intensity",
    "Billionaire Habits You Need to Start",
    "AI Models are Showing Signs of Emotion",
    "A Teenager Made $10K Using this Tool"
  ];
  
  const captions = [
    "🤖 This new AI tool is changing content creation forever! Follow for daily updates.",
    "💸 Best side hustle to launch in 2026. Zero upfront cost. Follow for money tips!",
    "🔥 Show up daily even when you don't feel like it. Follow for mindset hacks.",
    "📈 Learn the daily habits of self-made billionaires. Save this post for later!",
    "🤖 Introspection mapped in LLMs. The future is self-correcting models.",
    "💸 High schooler builds $10K MRR SaaS. Here is the exact stack they used."
  ];

  for (let i = 0; i < headlines.length; i++) {
    const category = categories[i % categories.length];
    
    await prisma.reel.create({
      data: {
        category,
        status: "UPLOADED",
        headline: headlines[i],
        script: {
          slides: [
            { slide_num: 1, headline: headlines[i], subheadline: "Tap to learn more" },
            { slide_num: 2, body: "Step-by-step breakdown" }
          ]
        },
        caption: captions[i],
        views: Math.floor(Math.random() * 400) + 150,
        likes: Math.floor(Math.random() * 80) + 20,
        comments: Math.floor(Math.random() * 15) + 2,
        scheduledFor: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)),
        postedAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000))
      }
    });
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
