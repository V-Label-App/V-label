import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearActivities() {
  try {
    const result = await prisma.taskActivity.deleteMany({});
    console.log(`✅ Deleted ${result.count} task activities`);
  } catch (error) {
    console.error('❌ Error clearing activities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearActivities();
