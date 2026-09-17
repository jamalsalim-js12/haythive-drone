import {
  AuditEntityType,
  ChargeStatus,
  CommandStatus,
  CommandType,
  Connectivity,
  FaultSeverity,
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

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

async function upsertAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
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
  return user;
}

async function upsertDock(dock: SeedDock) {
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
  return device;
}

async function seedLogsAndFaults(
  devices: Array<{ id: string; serial: string }>,
  actorId: string,
): Promise<void> {
  const deviceIds = devices.map((d) => d.id);

  await prisma.command.deleteMany({
    where: { deviceId: { in: deviceIds }, id: { startsWith: "seed-cmd-" } },
  });
  await prisma.auditEvent.deleteMany({
    where: { deviceId: { in: deviceIds }, id: { startsWith: "seed-aud-" } },
  });
  await prisma.fault.deleteMany({
    where: { deviceId: { in: deviceIds }, id: { startsWith: "seed-flt-" } },
  });

  const commandTypes = [
    CommandType.LID_OPEN,
    CommandType.LID_CLOSE,
    CommandType.PLATFORM_RAISE,
    CommandType.PLATFORM_LOWER,
    CommandType.ABORT,
  ] as const;
  const commandStatuses = [
    CommandStatus.ACKED,
    CommandStatus.ACKED,
    CommandStatus.ACKED,
    CommandStatus.FAILED,
    CommandStatus.TIMEOUT,
  ] as const;

  const commands = [];
  for (let i = 0; i < 36; i++) {
    const device =
      devices[i % 5 === 0 && devices.length > 1 ? 1 : 0] ?? devices[0];
    const type = commandTypes[i % commandTypes.length];
    const status = commandStatuses[i % commandStatuses.length];
    const createdAt = minutesAgo(i * 17 + 3);
    const completedAt = minutesAgo(i * 17);
    const id = `seed-cmd-${String(i + 1).padStart(3, "0")}`;
    commands.push({
      id,
      deviceId: device.id,
      actorId,
      type,
      status,
      message:
        status === CommandStatus.FAILED
          ? "Interlock rejected"
          : status === CommandStatus.TIMEOUT
            ? "Edge ack timeout"
            : "Stub edge acknowledged command",
      createdAt,
      updatedAt: completedAt,
      completedAt,
    });
  }

  await prisma.command.createMany({ data: commands });

  const auditEvents = commands.flatMap((command, i) => {
    const events: Array<{
      id: string;
      deviceId: string;
      actorId: string | null;
      action: string;
      entityType: AuditEntityType;
      entityId: string;
      meta: Record<string, string>;
      createdAt: Date;
    }> = [
      {
        id: `seed-aud-${command.id}`,
        deviceId: command.deviceId,
        actorId,
        action: `command.${command.type.toLowerCase()}`,
        entityType: AuditEntityType.COMMAND,
        entityId: command.id,
        meta: { status: command.status },
        createdAt: command.createdAt,
      },
    ];
    if (i % 4 === 0) {
      events.push({
        id: `seed-aud-state-${String(i).padStart(3, "0")}`,
        deviceId: command.deviceId,
        actorId: null,
        action: "state.transition",
        entityType: AuditEntityType.STATE,
        entityId: command.deviceId,
        meta: { from: "MOVING", to: "IDLE" },
        createdAt: minutesAgo(i * 17 + 1),
      });
    }
    return events;
  });

  await prisma.auditEvent.createMany({ data: auditEvents });

  const primary = devices[0];
  const secondary = devices[1] ?? devices[0];
  const faults = [
    {
      id: "seed-flt-001",
      deviceId: secondary.id,
      code: "HB_STALE",
      severity: FaultSeverity.WARNING,
      message: "Heartbeat age exceeded 30s threshold",
      resolved: false,
      createdAt: minutesAgo(12),
      resolvedAt: null as Date | null,
    },
    {
      id: "seed-flt-002",
      deviceId: primary.id,
      code: "LID_OBSTRUCT",
      severity: FaultSeverity.CRITICAL,
      message: "Lid obstruction detected during close - aborted",
      resolved: true,
      createdAt: hoursAgo(6),
      resolvedAt: hoursAgo(5),
    },
    {
      id: "seed-flt-003",
      deviceId: primary.id,
      code: "CHG_TEMP",
      severity: FaultSeverity.WARNING,
      message: "Charge pad temperature elevated",
      resolved: true,
      createdAt: hoursAgo(18),
      resolvedAt: hoursAgo(17),
    },
    {
      id: "seed-flt-004",
      deviceId: secondary.id,
      code: "PLT_LIMIT",
      severity: FaultSeverity.CRITICAL,
      message: "Platform travel limit switch trip",
      resolved: true,
      createdAt: hoursAgo(30),
      resolvedAt: hoursAgo(29),
    },
    {
      id: "seed-flt-005",
      deviceId: primary.id,
      code: "EDGE_RECONNECT",
      severity: FaultSeverity.WARNING,
      message: "Edge controller reconnected after brief dropout",
      resolved: true,
      createdAt: hoursAgo(48),
      resolvedAt: hoursAgo(47),
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `seed-flt-${String(i + 6).padStart(3, "0")}`,
      deviceId: i % 2 === 0 ? primary.id : secondary.id,
      code: i % 3 === 0 ? "COMM_GLITCH" : "SENSOR_NOISE",
      severity:
        i % 4 === 0 ? FaultSeverity.CRITICAL : FaultSeverity.WARNING,
      message:
        i % 3 === 0
          ? "Transient MQTT disconnect (auto-recovered)"
          : "Lid position sensor noise spike",
      resolved: true,
      createdAt: hoursAgo(50 + i * 5),
      resolvedAt: hoursAgo(49 + i * 5),
    })),
  ];

  await prisma.fault.createMany({ data: faults });

  console.log(
    `Seeded ${commands.length} commands, ${auditEvents.length} audit events, ${faults.length} faults`,
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

  const admin = await upsertAdmin(adminEmail, adminPassword);
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
  const dock1Token = process.env.SEED_DOCK_INGEST_TOKEN ?? "dev-dock-token";
  const dock2Serial = process.env.SEED_DOCK_2_SERIAL ?? "HH-DOCK-002";
  const dock2Token = process.env.SEED_DOCK_2_INGEST_TOKEN ?? "dev-dock-token-2";

  const dock1 = await upsertDock({
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

  const dock2 = await upsertDock({
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
          detail: "Charge fault - SOC 42%",
        },
        {
          id: "enclosure",
          label: "Lid closed / platform down",
          pass: false,
          detail: "Lid open / platform up",
        },
      ],
    },
  });

  await seedLogsAndFaults(
    [
      { id: dock1.id, serial: dock1.serial },
      { id: dock2.id, serial: dock2.serial },
    ],
    admin.id,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
