import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const modelMode = process.argv.includes("--model");
const webPort = modelMode ? 3200 : 3100;
const apiPort = modelMode ? 8200 : 8100;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(webDirectory, "../../..");
const apiDirectory = path.join(repositoryRoot, "apps", "api");
const modelPath = path.join(apiDirectory, "models", "garbage_classifier.pt");
const metadataPath = path.join(apiDirectory, "models", "metadata.json");
if (modelMode && (!existsSync(modelPath) || !existsSync(metadataPath))) {
  console.log("SKIP: actual model artifact or metadata is missing");
  process.exit(0);
}
const localUv = path.join(repositoryRoot, ".tools", "uv", "uv.exe");
const uvExecutable =
  process.env.UV_EXECUTABLE ?? (existsSync(localUv) ? localUv : "uv");
const databasePath = path.join(
  apiDirectory,
  "data",
  `e2e-${modelMode ? "model" : "mock"}-${process.pid}.db`,
);
const childEnvironment = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
  PLAYWRIGHT_WEB_PORT: String(webPort),
  MODEL_E2E: modelMode ? "1" : "0",
};

const sync = spawnSync(
  uvExecutable,
  ["sync", "--frozen", ...(modelMode ? ["--extra", "model"] : [])],
  {
    cwd: apiDirectory,
    env: {
      ...process.env,
      UV_CACHE_DIR: path.join(repositoryRoot, ".uv-cache"),
    },
    stdio: "inherit",
  },
);
if (sync.status !== 0) process.exit(sync.status ?? 1);
const pythonExecutable = path.join(
  apiDirectory,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

const apiServer = spawn(
  pythonExecutable,
  [
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
      INFERENCE_MODE: modelMode ? "model" : "mock",
      MODEL_PATH: modelPath,
      MODEL_METADATA_PATH: metadataPath,
      DATABASE_URL: `sqlite:///${databasePath}`,
      CORS_ORIGINS: webBaseUrl,
      UV_CACHE_DIR: path.join(repositoryRoot, ".uv-cache"),
    },
    stdio: "inherit",
  },
);

const webServer = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(webPort),
  ],
  {
    cwd: path.join(repositoryRoot, "apps", "web"),
    env: childEnvironment,
    stdio: "inherit",
  },
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
  if (processHandle.exitCode !== null || processHandle.pid === undefined)
    return;
  const exited = new Promise((resolve) =>
    processHandle.once("exit", () => resolve(true)),
  );
  processHandle.kill("SIGTERM");
  const stopped = await Promise.race([exited, delay(3_000).then(() => false)]);
  if (!stopped && process.platform === "win32") {
    const killer = spawn(
      "taskkill",
      ["/pid", String(processHandle.pid), "/T", "/F"],
      {
        detached: true,
        stdio: "ignore",
      },
    );
    killer.unref();
  }
  processHandle.unref();
}

try {
  await Promise.all([
    waitForServer(apiServer, `${apiBaseUrl}/api/v1/health`, "FastAPI"),
    waitForServer(webServer, `${webBaseUrl}/classify`, "Next.js"),
  ]);
  const runnerArguments = [
    "node_modules/@playwright/test/cli.js",
    "test",
    ...(modelMode ? ["model.spec.ts"] : []),
  ];
  const runner = spawn(process.execPath, runnerArguments, {
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
  rmSync(databasePath, { force: true, maxRetries: 5, retryDelay: 200 });
}
