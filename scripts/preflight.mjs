#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key]) continue;

    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const unquoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = unquoted;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const requiredEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];

const missing = requiredEnvVars.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error("\n❌ Preflight failed: missing required environment variables:\n");
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error("\nAdd them to your deployment environment and rerun preflight.\n");
  process.exit(1);
}

const checks = [
  {
    label: strict ? "Lint (strict, no warnings)" : "Lint",
    command: "npm",
    args: strict ? ["run", "lint", "--", "--max-warnings=0"] : ["run", "lint"],
  },
  {
    label: "Typecheck",
    command: "npx",
    args: ["tsc", "--noEmit"],
  },
  {
    label: "Production build",
    command: "npm",
    args: ["run", "build"],
  },
];

for (const check of checks) {
  console.log(`\n▶ ${check.label}`);
  const result = spawnSync(check.command, check.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n❌ Preflight failed at: ${check.label}\n`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✅ Preflight passed: app is ready for staging/production deployment checks.\n");
