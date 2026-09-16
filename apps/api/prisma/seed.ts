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
      lastHeartbeatAt: new Date(),
    },
    create: {
      name: "Lab Dock 1",
      serial,
      siteId: site.id,
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

  console.log(`Seeded operator ${email} (password: ${password})`);
  console.log(`Seeded dock ${serial} (${device.id}) at site ${site.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
