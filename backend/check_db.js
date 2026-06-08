const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.settings.findMany();
  console.log("Settings count:", settings.length);
  const accounts = await prisma.instagram_accounts.findMany();
  console.log("Instagram accounts:", accounts.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
