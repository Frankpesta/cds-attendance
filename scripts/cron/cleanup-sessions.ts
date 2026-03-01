/**
 * Cron script: Clean up expired sessions.
 * Run daily (e.g. 0 2 * * * = 2 AM) on Spaceship:
 *   npx ts-node scripts/cron/cleanup-sessions.ts
 * Or with node after compiling:
 *   node scripts/cron/cleanup-sessions.js
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const deleted = await prisma.session.deleteMany({
    where: {
      expires_at: { lt: BigInt(now) },
    },
  });
  console.log(`[${new Date().toISOString()}] Deleted ${deleted.count} expired sessions`);
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
