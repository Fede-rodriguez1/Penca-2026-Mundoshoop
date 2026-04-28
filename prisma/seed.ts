import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Crear penca default si no existe
  const penca = await prisma.penca.upsert({
    where: { code: "GENERAL2026" },
    update: {},
    create: { name: "Penca General", code: "GENERAL2026", isDefault: true },
  });
  console.log("Penca default:", penca.name, `(${penca.code})`);

  // Asignar usuarios sin penca a la default
  const result = await prisma.user.updateMany({
    where: { pencaId: null },
    data: { pencaId: penca.id },
  });
  console.log("Usuarios migrados:", result.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
