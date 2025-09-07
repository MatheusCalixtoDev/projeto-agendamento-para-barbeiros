// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const plainPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  // Aumentamos o custo para 12 para maior segurança
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  console.log(`Verificando/Criando usuário admin: ${username}`);

  const admin = await prisma.admin.upsert({
    where: { username: username },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      username: username,
      passwordHash: hashedPassword,
    },
  });

  console.log(
    `Usuário admin '${admin.username}' criado/atualizado com sucesso.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
