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

type SeedDock = {
  serial: string;
  name: string;
  ingestToken: string;
  siteId: string;
  state: {
    connectivity: Connectivity;
    opState: OpState;
    lid: LidState;
    platform: PlatformState;
    chargeStatus: ChargeStatus;
    socPercent: number;
    readiness: Readiness;
    readinessReasons: Array<{
      id: string;
      label: string;
      pass: boolean;
      detail?: string;
    }>;
  };
};

async function upsertAdmin(email: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`Seeded admin ${email} (password: ${password})`);
}

async function upsertDock(dock: SeedDock): Promise<void> {
  const ingestTokenHash = await bcrypt.hash(dock.ingestToken, 10);
  const device = await prisma.device.upsert({
    where: { serial: dock.serial },
    update: {
      name: dock.name,
      siteId: dock.siteId,
      ingestTokenHash,
      lastHeartbeatAt: new Date(),
    },
    create: {
      name: dock.name,
      serial: dock.serial,
      siteId: dock.siteId,
      ingestTokenHash,
      lastHeartbeatAt: new Date(),
    },
  });

  await prisma.deviceState.upsert({
    where: { deviceId: device.id },
    update: { ...dock.state },
    create: {
      deviceId: device.id,
      ...dock.state,
    },
  });

  console.log(
    `Seeded dock ${dock.serial} (${device.id}) — ${dock.name}; ingest token: ${dock.ingestToken}`,
  );
}

async function main() {
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ??
    process.env.SEED_OPERATOR_EMAIL ??
    "admin@ioteedom.com";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ??
    process.env.SEED_OPERATOR_PASSWORD ??
    "admin123";

  await upsertAdmin(adminEmail, adminPassword);
  await upsertAdmin("admin@haythive.com", "admin123");

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

  const labSite = await prisma.site.upsert({
    where: { id: "seed-site-lab" },
    update: { name: "IoTeedom Lab", timezone: "UTC" },
    create: {
      id: "seed-site-lab",
      name: "IoTeedom Lab",
      timezone: "UTC",
    },
  });

  const yardSite = await prisma.site.upsert({
    where: { id: "seed-site-yard" },
    update: { name: "North Yard", timezone: "UTC" },
    create: {
      id: "seed-site-yard",
      name: "North Yard",
      timezone: "UTC",
    },
  });

  const dock1Serial = process.env.SEED_DOCK_SERIAL ?? "HH-DOCK-001";
  const dock1Token =
    process.env.SEED_DOCK_INGEST_TOKEN ?? "dev-dock-token";
  const dock2Serial = process.env.SEED_DOCK_2_SERIAL ?? "HH-DOCK-002";
  const dock2Token =
    process.env.SEED_DOCK_2_INGEST_TOKEN ?? "dev-dock-token-2";

  await upsertDock({
    serial: dock1Serial,
    name: "Lab Dock 1",
    ingestToken: dock1Token,
    siteId: labSite.id,
    state: {
      connectivity: Connectivity.ONLINE,
      opState: OpState.IDLE,
      lid: LidState.CLOSED,
      platform: PlatformState.DOWN,
      chargeStatus: ChargeStatus.CHARGING,
      socPercent: 86,
      readiness: Readiness.READY,
      readinessReasons: [
        { id: "connectivity", label: "Dock online", pass: true },
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
      ],
    },
  });

  await upsertDock({
    serial: dock2Serial,
    name: "Yard Dock 2",
    ingestToken: dock2Token,
    siteId: yardSite.id,
    state: {
      connectivity: Connectivity.DEGRADED,
      opState: OpState.FAULT,
      lid: LidState.OPEN,
      platform: PlatformState.UP,
      chargeStatus: ChargeStatus.FAULT,
      socPercent: 42,
      readiness: Readiness.NOT_READY,
      readinessReasons: [
        {
          id: "connectivity",
          label: "Dock online",
          pass: false,
          detail: "Degraded link",
        },
        {
          id: "charge",
          label: "Charging healthy",
          pass: false,
          detail: "Charge fault · SOC 42%",
        },
        {
          id: "enclosure",
          label: "Lid closed / platform down",
          pass: false,
          detail: "Lid open · platform up",
        },
      ],
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
