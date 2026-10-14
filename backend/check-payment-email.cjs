const prisma = require("./config/prisma");

async function main() {
  const booking = await prisma.booking.findFirst({
    orderBy: { id: "desc" },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  console.dir(booking, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
