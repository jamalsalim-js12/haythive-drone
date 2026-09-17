import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

const requireFromHere = createRequire(__filename);

function prismaCli(): string {
  return requireFromHere.resolve("prisma/build/index.js");
}

function runPrisma(args: string[]): void {
  const apiRoot = join(__dirname, "..");
  execFileSync(process.execPath, [prismaCli(), ...args], {
    cwd: apiRoot,
    stdio: "inherit",
    env: process.env,
  });
}

/**
 * Platforms often start with `node dist/main` and skip npm scripts.
 * Apply migrations (and optional seed) before Nest boots so the schema exists.
 */
export function prepareDatabase(): void {
  if (process.env.SKIP_DB_MIGRATE !== "true") {
    console.log("[db] prisma migrate deploy");
    runPrisma(["migrate", "deploy"]);
  }

  const shouldSeed =
    process.env.SKIP_DB_SEED !== "true" &&
    (process.env.NODE_ENV === "production" ||
      process.env.SEED_ON_START === "true");

  if (shouldSeed) {
    console.log("[db] prisma db seed");
    runPrisma(["db", "seed"]);
  }
}
