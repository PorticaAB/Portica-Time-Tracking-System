import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSwedishHolidays } from "../src/lib/swedishHolidays";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  await prisma.user.upsert({
    where: { email: "catarina@portica.se" },
    update: {},
    create: {
      email: "catarina@portica.se",
      name: "Catarina Bertling",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const contractorPasswordHash = await bcrypt.hash("Contractor123!", 10);
  const contractor = await prisma.user.upsert({
    where: { email: "anna@portica.se" },
    update: {},
    create: {
      email: "anna@portica.se",
      name: "Anna Andersson",
      passwordHash: contractorPasswordHash,
      role: "CONTRACTOR",
    },
  });

  const client = await prisma.client.upsert({
    where: { id: "seed-client-acme" },
    update: {},
    create: { id: "seed-client-acme", name: "Acme AB" },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-website" },
    update: {},
    create: {
      id: "seed-project-website",
      name: "Website Redesign",
      clientId: client.id,
      billableRate: 850,
      currency: "SEK",
    },
  });

  await prisma.projectAssignment.upsert({
    where: { projectId_userId: { projectId: project.id, userId: contractor.id } },
    update: {},
    create: { projectId: project.id, userId: contractor.id },
  });

  for (const name of ["Design", "Client Call", "Revisions", "Development"]) {
    await prisma.task.upsert({
      where: { projectId_name: { projectId: project.id, name } },
      update: {},
      create: { name, projectId: project.id },
    });
  }

  const thisYear = new Date().getFullYear();
  for (const year of [thisYear, thisYear + 1]) {
    for (const h of getSwedishHolidays(year)) {
      await prisma.holiday.upsert({
        where: { date: new Date(h.date) },
        update: { name: h.name },
        create: { date: new Date(h.date), name: h.name },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
