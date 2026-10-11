import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { DEFAULT_SETTINGS } from "../config/settings.js";

const DEV_PASSWORD = "Test1234!";
const ADMIN_PASSWORD = "Admin123!";

const BADGES = [
  { code: "FIRST_WORKOUT", name: "First Workout", audience: "MEMBER" },
  { code: "STREAK_3", name: "3-Day Streak", audience: "MEMBER" },
  { code: "STREAK_7", name: "7-Day Streak", audience: "MEMBER" },
  { code: "STREAK_30", name: "30-Day Streak", audience: "MEMBER" },
  { code: "FIRST_SESSION", name: "First Session", audience: "PROVIDER" },
  { code: "SESSIONS_50", name: "50 Sessions", audience: "PROVIDER" },
  { code: "SESSIONS_100", name: "100 Sessions", audience: "PROVIDER" },
  { code: "RATING_4_5", name: "Top Rated (4.5+)", audience: "PROVIDER" },
];

async function seedCore() {
  // Refresh descriptions without overwriting customized setting values.
  for (const [key, setting] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: { description: setting.description },
      create: {
        key,
        value: setting.value,
        description: setting.description,
      },
    });
  }

  // Create or update the platform badges.
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        audience: badge.audience,
      },
      create: {
        code: badge.code,
        name: badge.name,
        audience: badge.audience,
      },
    });
  }

  console.log(
    `Core seed OK: ${Object.keys(DEFAULT_SETTINGS).length} settings, ${BADGES.length} badges`,
  );
}

const GYM_PACKAGES = [
  {
    name: "Daily Pass",
    type: "daily",
    price: 150,
    durationDays: 1,
    benefits: "One day of access, bring up to 4 friends",
    maxVisits: 1,
    allowedDays: [],
    allowedPeriods: [],
    maxGroupSize: 5,
  },
  {
    name: "Weekday Mornings Monthly",
    type: "monthly",
    price: 1800,
    durationDays: 30,
    benefits: "Monday to Friday, mornings only, up to 20 visits",
    maxVisits: 20,
    allowedDays: [1, 2, 3, 4, 5],
    allowedPeriods: ["MORNING"],
    maxGroupSize: 1,
  },
  {
    name: "Anytime Monthly",
    type: "monthly",
    price: 2500,
    durationDays: 30,
    benefits: "Any day, any time, unlimited visits",
    maxVisits: null,
    allowedDays: [],
    allowedPeriods: [],
    maxGroupSize: 3,
  },
];

const PROVIDERS = [
  {
    key: "sara",
    name: "Sara Tadesse",
    phone: "+251911000001",
    type: "TRAINER",
    bio: "Strength and weight-loss coach. Works weekday mornings.",
    specializations: ["Strength", "Weight loss"],
    experienceYears: 6,
    certifications: ["NASM CPT"],
    availability: {
      days: [1, 2, 3, 4, 5],
      periods: ["MORNING"],
    },
    packages: [
      {
        name: "4 Sessions",
        sessionCount: 4,
        price: 1200,
        validityDays: 30,
      },
      {
        name: "8 Sessions",
        sessionCount: 8,
        price: 2200,
        validityDays: 60,
      },
    ],
  },
  {
    key: "dawit",
    name: "Dawit Alemu",
    phone: "+251911000002",
    type: "TRAINER",
    bio: "Bodybuilding and conditioning coach. Works evenings, every day.",
    specializations: ["Bodybuilding", "Conditioning"],
    experienceYears: 9,
    certifications: ["ACE CPT"],
    availability: {
      days: [0, 1, 2, 3, 4, 5, 6],
      periods: ["EVENING"],
    },
    packages: [
      {
        name: "4 Sessions",
        sessionCount: 4,
        price: 1400,
        validityDays: 30,
      },
      {
        name: "8 Sessions",
        sessionCount: 8,
        price: 2600,
        validityDays: 60,
      },
    ],
  },
  {
    key: "hana",
    name: "Dr. Hana Bekele",
    phone: "+251911000003",
    type: "PHYSIOTHERAPIST",
    bio: "Sports injury rehabilitation. Works weekends.",
    specializations: ["Injury recovery", "Back pain"],
    experienceYears: 8,
    certifications: ["BSc Physiotherapy"],
    availability: {
      days: [6, 0],
      periods: ["MORNING", "AFTERNOON"],
    },
    packages: [
      {
        name: "3 Rehab Sessions",
        sessionCount: 3,
        price: 1500,
        validityDays: 30,
      },
      {
        name: "6 Rehab Sessions",
        sessionCount: 6,
        price: 2700,
        validityDays: 60,
      },
    ],
  },
];

const GYMS = [
  {
    slug: "bole",
    name: "Bole Fitness Hub",
    address: "Bole, Addis Ababa",
    latitude: 8.9951,
    longitude: 38.7851,
    capacity: 30,
    amenities: ["Showers", "Lockers", "Cardio zone", "Free weights"],
  },
  {
    slug: "piassa",
    name: "Piassa Power Gym",
    address: "Piassa, Addis Ababa",
    latitude: 9.0348,
    longitude: 38.7522,
    capacity: 20,
    amenities: ["Lockers", "Free weights", "Boxing area"],
  },
];

const CONSULTANTS = [
  {
    name: "Meron Haile",
    email: "meron.nutrition@gym.test",
    phone: "+251911000101",
    specializations: ["Weight management", "Sports nutrition"],
  },
  {
    name: "Yonas Girma",
    email: "yonas.nutrition@gym.test",
    phone: "+251911000102",
    specializations: ["Muscle gain", "Diabetes-friendly diets"],
  },
];

async function seedDev() {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const devHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const logins = [];

  // Admin: owns both gyms.
  const admin = await prisma.gymAdmin.upsert({
    where: { email: "admin@gym.test" },
    update: {},
    create: {
      name: "Dev Admin",
      email: "admin@gym.test",
      password: adminHash,
    },
  });

  logins.push({
    role: "GYM_ADMIN",
    email: admin.email,
    password: ADMIN_PASSWORD,
    note: "owns both gyms",
  });

  // Member.
  const member = await prisma.user.upsert({
    where: { email: "member@gym.test" },
    update: {},
    create: {
      name: "Test Member",
      email: "member@gym.test",
      phone: "+251911000999",
      password: devHash,
    },
  });

  logins.push({
    role: "MEMBER",
    email: member.email,
    password: DEV_PASSWORD,
  });

  // Platform-wide consultants without a gym.
  for (const consultantData of CONSULTANTS) {
    const consultant = await prisma.provider.upsert({
      where: { email: consultantData.email },
      update: {},
      create: {
        type: "NUTRITION_CONSULTANT",
        name: consultantData.name,
        email: consultantData.email,
        phone: consultantData.phone,
        password: devHash,
        mustChangePassword: false,
        bio: "Registered dietitian. Chat-only consultations.",
        specializations: consultantData.specializations,
        experienceYears: 5,
        certifications: ["Registered Dietitian"],
      },
    });

    logins.push({
      role: "NUTRITION_CONSULTANT",
      email: consultant.email,
      password: DEV_PASSWORD,
      note: "no gym",
    });
  }

  // Create gyms and their associated data.
  for (const gymData of GYMS) {
    let gym = await prisma.gym.findFirst({
      where: {
        adminId: admin.id,
        name: gymData.name,
      },
    });

    if (!gym) {
      gym = await prisma.gym.create({
        data: {
          adminId: admin.id,
          name: gymData.name,
          address: gymData.address,
          latitude: gymData.latitude,
          longitude: gymData.longitude,
          openingTime: "06:00",
          closingTime: "22:00",
          capacity: gymData.capacity,
          photos: [],
          amenities: [...gymData.amenities],
        },
      });
    }

    // Gym packages.
    for (const packageData of GYM_PACKAGES) {
      const existingPackage = await prisma.package.findFirst({
        where: {
          gymId: gym.id,
          name: packageData.name,
        },
      });

      if (!existingPackage) {
        await prisma.package.create({
          data: {
            gymId: gym.id,
            ...packageData,
          },
        });
      }
    }

    // Staff: only the first gym gets a staff account.
    if (gymData.slug === "bole") {
      const email = `staff.${gymData.slug}@gym.test`;

      const staff = await prisma.gymStaff.upsert({
        where: { email },
        update: {},
        create: {
          gymId: gym.id,
          name: "Bole Front Desk",
          email,
          phone: "+251911000500",
          password: devHash,
          mustChangePassword: false,
        },
      });

      logins.push({
        role: "GYM_STAFF",
        email: staff.email,
        password: DEV_PASSWORD,
        note: gymData.name,
      });
    }

    // Providers, availability, and provider packages.
    for (const providerData of PROVIDERS) {
      const email = `${providerData.key}.${gymData.slug}@gym.test`;

      const provider = await prisma.provider.upsert({
        where: { email },
        update: {},
        create: {
          type: providerData.type,
          gymId: gym.id,
          name: providerData.name,
          email,
          phone: providerData.phone,
          password: devHash,
          mustChangePassword: false,
          bio: providerData.bio,
          specializations: providerData.specializations,
          experienceYears: providerData.experienceYears,
          certifications: providerData.certifications,
        },
      });

      const availabilitySlots = providerData.availability.days.flatMap(
        (dayOfWeek) =>
          providerData.availability.periods.map((period) => ({
            providerId: provider.id,
            dayOfWeek,
            period,
          })),
      );

      await prisma.providerAvailability.createMany({
        data: availabilitySlots,
        skipDuplicates: true,
      });

      for (const packageData of providerData.packages) {
        const existingPackage = await prisma.providerPackage.findFirst({
          where: {
            providerId: provider.id,
            name: packageData.name,
          },
        });

        if (!existingPackage) {
          await prisma.providerPackage.create({
            data: {
              providerId: provider.id,
              ...packageData,
            },
          });
        }
      }

      logins.push({
        role: providerData.type,
        email: provider.email,
        password: DEV_PASSWORD,
        note: gymData.name,
      });
    }
  }

  console.log("\nDev data OK. Logins:");
  console.table(logins);
}

async function main() {
  const coreOnly = process.argv.includes("--core-only");
  const isProd = process.env.NODE_ENV === "production";

  await seedCore();

  if (isProd || coreOnly) {
    console.log(
      isProd
        ? "NODE_ENV=production: dev data skipped."
        : "Dev data skipped (--core-only).",
    );
    return;
  }

  await seedDev();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
