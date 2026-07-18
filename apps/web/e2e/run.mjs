import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const webPort = 3100;
const apiPort = 8100;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(webDirectory, "../../..");
const apiDirectory = path.join(repositoryRoot, "apps", "api");
const localUv = path.join(repositoryRoot, ".tools", "uv", "uv.exe");
const uvExecutable = process.env.UV_EXECUTABLE ?? (existsSync(localUv) ? localUv : "uv");
const childEnvironment = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
};

const apiServer = spawn(
  uvExecutable,
  [
    "run",
    "python",
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(apiPort),
  ],
  {
    cwd: apiDirectory,
    env: {
      ...process.env,
      APP_ENV: "test",
      INFERENCE_MODE: "mock",
      DATABASE_URL: `sqlite:///./data/e2e-${process.pid}.db`,
      CORS_ORIGINS: webBaseUrl,
      UV_CACHE_DIR: path.join(repositoryRoot, ".uv-cache"),
    },
    stdio: "inherit",
  },
);

const webServer = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(webPort)],
  { cwd: path.join(repositoryRoot, "apps", "web"), env: childEnvironment, stdio: "inherit" },
);

async function waitForServer(processHandle, url, name) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`${name} exited with code ${processHandle.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting; retry within the bounded deadline.
    }
    await delay(500);
  }
  throw new Error(`${name} did not become ready within 120 seconds`);
}

async function stopServer(processHandle) {
  if (processHandle.exitCode !== null || processHandle.pid === undefined) return;
  const exited = new Promise((resolve) => processHandle.once("exit", () => resolve(true)));
  processHandle.kill("SIGTERM");
  const stopped = await Promise.race([exited, delay(3_000).then(() => false)]);
  if (!stopped && process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(processHandle.pid), "/T", "/F"], {
      detached: true,
      stdio: "ignore",
    });
    killer.unref();
  }
  processHandle.unref();
}

try {
  await Promise.all([
    waitForServer(apiServer, `${apiBaseUrl}/api/v1/health`, "FastAPI"),
    waitForServer(webServer, `${webBaseUrl}/classify`, "Next.js"),
  ]);
  const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
    cwd: path.join(repositoryRoot, "apps", "web"),
    env: childEnvironment,
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    runner.once("exit", (code) => resolve(code ?? 1));
    runner.once("error", reject);
  });
  process.exitCode = exitCode;
} finally {
  await Promise.all([stopServer(webServer), stopServer(apiServer)]);
}
