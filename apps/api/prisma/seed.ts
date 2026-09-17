import {
  ChargeStatus,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
  PrismaClient,
  Readiness,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ??
    process.env.SEED_OPERATOR_EMAIL ??
    "admin@ioteedom.com";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ??
    process.env.SEED_OPERATOR_PASSWORD ??
    "admin123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const operatorEmail = process.env.SEED_DEMO_OPERATOR_EMAIL;
  const operatorPassword = process.env.SEED_DEMO_OPERATOR_PASSWORD ?? "demo";
  if (operatorEmail && operatorEmail !== adminEmail) {
    const operatorPasswordHash = await bcrypt.hash(operatorPassword, 10);
    await prisma.user.upsert({
      where: { email: operatorEmail },
      update: {
        passwordHash: operatorPasswordHash,
        role: UserRole.OPERATOR,
      },
      create: {
        email: operatorEmail,
        passwordHash: operatorPasswordHash,
        role: UserRole.OPERATOR,
      },
    });
    console.log(
      `Seeded operator ${operatorEmail} (password: ${operatorPassword})`,
    );
  }

  const site = await prisma.site.upsert({
    where: { id: "seed-site-lab" },
    update: { name: "IoTeedom Lab", timezone: "UTC" },
    create: {
      id: "seed-site-lab",
      name: "IoTeedom Lab",
      timezone: "UTC",
    },
  });

  const serial = process.env.SEED_DOCK_SERIAL ?? "HH-DOCK-001";
  const ingestToken = process.env.SEED_DOCK_INGEST_TOKEN ?? "dev-dock-token";
  const ingestTokenHash = await bcrypt.hash(ingestToken, 10);

  const readinessReasons = [
    {
      id: "connectivity",
      label: "Dock online",
      pass: true,
    },
    {
      id: "charge",
      label: "Charging healthy",
      pass: true,
      detail: "SOC 86%",
    },
    {
      id: "enclosure",
      label: "Lid closed / platform down",
      pass: true,
    },
  ];

  const device = await prisma.device.upsert({
    where: { serial },
    update: {
      name: "Lab Dock 1",
      siteId: site.id,
      ingestTokenHash,
      lastHeartbeatAt: new Date(),
    },
    create: {
      name: "Lab Dock 1",
      serial,
      siteId: site.id,
      ingestTokenHash,
      lastHeartbeatAt: new Date(),
    },
  });

  await prisma.deviceState.upsert({
    where: { deviceId: device.id },
    update: {
      connectivity: Connectivity.ONLINE,
      opState: OpState.IDLE,
      lid: LidState.CLOSED,
      platform: PlatformState.DOWN,
      chargeStatus: ChargeStatus.CHARGING,
      socPercent: 86,
      readiness: Readiness.READY,
      readinessReasons,
    },
    create: {
      deviceId: device.id,
      connectivity: Connectivity.ONLINE,
      opState: OpState.IDLE,
      lid: LidState.CLOSED,
      platform: PlatformState.DOWN,
      chargeStatus: ChargeStatus.CHARGING,
      socPercent: 86,
      readiness: Readiness.READY,
      readinessReasons,
    },
  });

  console.log(`Seeded admin ${adminEmail} (password: ${adminPassword})`);
  console.log(`Seeded dock ${serial} (${device.id}) at site ${site.name}`);
  console.log(`Dock ingest token: ${ingestToken}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
