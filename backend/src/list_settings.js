const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.setting.findMany();
  console.log("Settings:");
  settings.forEach(s => {
    // Mask sensitive keys but print existence
    const val = s.key.includes("password") || s.key.includes("key") ? `${s.value.substring(0, 5)}...` : s.value;
    console.log(`- ${s.key}: ${val}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
