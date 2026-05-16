import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(configDir, "../..");
const repoRoot = resolve(apiRoot, "../..");

const envFiles = [
  resolve(repoRoot, ".env"),
  resolve(repoRoot, ".env.local"),
  resolve(apiRoot, ".env"),
  resolve(apiRoot, ".env.local")
];

const loadedEnv: Record<string, string> = {};

for (const filePath of envFiles) {
  if (!existsSync(filePath)) {
    continue;
  }

  Object.assign(loadedEnv, parseEnv(readFileSync(filePath, "utf8")));
}

for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

function parseEnv(source: string) {
  const values: Record<string, string> = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = unquote(value);
  }

  return values;
}

function unquote(value: string) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
