import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
).replace(/\/$/, "");
const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi",
);
const outFile = path.join(outDir, "openapi.json");

const response = await fetch(`${apiUrl}/api/docs-json`);
if (!response.ok) {
  throw new Error(
    `Failed to fetch OpenAPI: ${response.status} ${response.statusText}`,
  );
}

await mkdir(outDir, { recursive: true });
await writeFile(outFile, await response.text());
console.log(`Wrote ${outFile}`);
