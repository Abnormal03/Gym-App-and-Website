const bcrypt = require("bcryptjs");
const prisma = require("./config/prisma");

async function main() {
  const admin = await prisma.gymAdmin.findUnique({
    where: { email: "admin@gym.test" },
  });

  console.log("Admin exists:", Boolean(admin));

  if (admin) {
    console.log(
      "Password matches:",
      await bcrypt.compare("Admin123!", admin.password)
    );
    console.log("Admin ID:", admin.id);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
