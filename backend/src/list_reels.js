const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reels = await prisma.reel.findMany({
    orderBy: { createdAt: "desc" }
  });
  console.log("Total reels:", reels.length);
  reels.forEach(r => {
    console.log(`- ID: ${r.id}, Category: ${r.category}, Status: ${r.status}, Headline: "${r.headline}", Views: ${r.views}, Likes: ${r.likes}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
