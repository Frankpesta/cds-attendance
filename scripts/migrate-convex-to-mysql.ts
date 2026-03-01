/**
 * Data migration: Convex → MySQL
 *
 * Prerequisites:
 * 1. Export data from Convex: npx convex export --path ./convex-export
 * 2. Set DATABASE_URL in .env
 * 3. Run: npx ts-node scripts/migrate-convex-to-mysql.ts
 *
 * This script provides a template. Customize table mapping and field
 * transformations based on your Convex schema and export format.
 *
 * For medical files: Convex storage IDs must be migrated separately.
 * Download files from Convex storage and upload to FILE_STORAGE_PATH,
 * then update corp_member_docs.medical_files with new file_path values.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Convex to MySQL migration template.");
  console.log("1. Export Convex data: npx convex export --path ./convex-export");
  console.log("2. Customize this script to map your export format to Prisma models");
  console.log("3. For each table, read JSON and insert via prisma.<model>.createMany()");
  console.log("");
  console.log("Example for users table:");
  console.log("  const users = JSON.parse(readFileSync('convex-export/users.json'));");
  console.log("  for (const u of users) {");
  console.log("    await prisma.user.create({ data: { id: u._id, name: u.name, ... } });");
  console.log("  }");
  console.log("");
  console.log("Medical files: Migrate from Convex storage to local/S3, update file_path in corp_member_docs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
