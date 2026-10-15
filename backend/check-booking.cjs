const prisma = require("./config/prisma");

async function main() {
  const booking = await prisma.booking.findUnique({
    where: { id: 21 },
    select: {
      id: true,
      userId: true,
      gymId: true,
      packageId: true,
      status: true,
      slotStart: true,
      slotEnd: true,
    },
  });

  console.dir({ booking }, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
