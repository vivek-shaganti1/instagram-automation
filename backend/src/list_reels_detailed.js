const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reels = await prisma.reel.findMany({
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("Latest reels scripts:");
  reels.forEach(r => {
    console.log(`\n===========================================`);
    console.log(`ID: ${r.id}`);
    console.log(`Category: ${r.category}`);
    console.log(`Status: ${r.status}`);
    console.log(`Headline: "${r.headline}"`);
    console.log(`Script JSON:`);
    console.log(JSON.stringify(r.script, null, 2));
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
