const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reels = await prisma.reel.findMany();
  console.log(reels.map(r => ({id: r.id, status: r.status, headline: r.headline})));
}
main().catch(console.error).finally(() => prisma.$disconnect());
