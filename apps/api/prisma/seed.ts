import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OPERATOR_EMAIL ?? "operator@haythive.local";
  const password = process.env.SEED_OPERATOR_PASSWORD ?? "demo";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.OPERATOR,
    },
    create: {
      email,
      passwordHash,
      role: UserRole.OPERATOR,
    },
  });

  console.log(`Seeded operator ${email} (password: ${password})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
