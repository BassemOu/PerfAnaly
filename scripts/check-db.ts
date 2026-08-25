import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const faculty = await prisma.facultyProfile.count();
  const reviews = await prisma.performanceReview.count();
  const rated   = await prisma.performanceReview.count({ where: { teachingRating: { not: null } } });
  const overall = await prisma.performanceReview.count({ where: { overallRating: { not: null } } });

  console.log("Faculty profiles :", faculty);
  console.log("Performance reviews:", reviews);
  console.log("With teachingRating:", rated);
  console.log("With overallRating :", overall);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
