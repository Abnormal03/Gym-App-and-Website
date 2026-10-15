const prisma = require("./config/prisma");

async function main() {
  const result = await prisma.user.update({
    where: { id: 1 },
    data: { email: "melktsega77@gmail.com" },
    select: { id: true, email: true },
  });

  console.log("Updated test user email:");
  console.log(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
