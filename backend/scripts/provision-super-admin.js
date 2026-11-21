require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function main() {
  const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
  if (!SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) throw new Error('Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD');
  if (SUPER_ADMIN_PASSWORD.length < 12) throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters');
  const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const password = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const actor = await prisma.superAdmin.upsert({ where: { email }, create: { name: SUPER_ADMIN_NAME.trim(), email, password }, update: { name: SUPER_ADMIN_NAME.trim(), password, isActive: true }, select: { id: true, name: true, email: true } });
  console.log(`Provisioned super-admin account ${actor.email} (id ${actor.id}).`);
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
