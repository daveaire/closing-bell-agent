import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = path.join(root, 'reports');
const intervalMs = Number(process.env.MONITOR_INTERVAL_MS || 15 * 60 * 1000);
const maxCycles = Number(process.env.MONITOR_MAX_CYCLES || 0);
const minimumDeltaUsd = Number(process.env.MONITOR_MIN_QUOTE_DELTA_USD || 1);

if (!Number.isFinite(intervalMs) || intervalMs < 30_000) {
  throw new Error('MONITOR_INTERVAL_MS must be at least 30000');
}
if (!Number.isFinite(maxCycles) || maxCycles < 0) throw new Error('MONITOR_MAX_CYCLES must be non-negative');
if (!Number.isFinite(minimumDeltaUsd)) throw new Error('MONITOR_MIN_QUOTE_DELTA_USD must be numeric');

function runScript(filename, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'src', filename)], {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${filename} exited ${code}: ${stderr || stdout}`));
    });
  });
}

const readJson = filename => JSON.parse(fs.readFileSync(path.join(reports, filename), 'utf8'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runCycle(cycle) {
  const startedAt = new Date();
  const discoveryFilename = 'cross-monitor-discovery.json';
  const probeFilename = 'cross-monitor-probe.json';
  await runScript('cross-market-scan.js', { CROSS_SCAN_OUTPUT_FILE: discoveryFilename });
  const discovery = readJson(discoveryFilename);
  const probes = [];

  for (let index = 0; index < discovery.spreads.length; index += 1) {
    await runScript('probe-cross-route.js', {
      CROSS_SIGNAL_INDEX: String(index),
      CROSS_SPREAD_INPUT_FILE: discoveryFilename,
      CROSS_PROBE_OUTPUT_FILE: probeFilename,
    });
    probes.push(readJson(probeFilename));
  }

  const positiveQuoteWindows = probes.filter(result =>
    result.quoteImpliedDeltaUsd >= minimumDeltaUsd
    && result.buy?.calldataBuilt
    && result.sell?.calldataBuilt,
  );
  const status = {
    cycle,
    healthy: true,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    sourceCandidateCount: discovery.sourceCandidateCount,
    grossSignalCount: discovery.spreadCount,
    probedCount: probes.length,
    minimumDeltaUsd,
    positiveQuoteWindowCount: positiveQuoteWindows.length,
    positiveQuoteWindows,
    probes: probes.map(result => ({
      ticker: result.underlyingTicker,
      quoteImpliedDeltaUsd: result.quoteImpliedDeltaUsd,
      decision: result.decision,
      reasons: result.reasons,
    })),
  };
  fs.writeFileSync(path.join(reports, 'cross-monitor-status.json'), JSON.stringify(status, null, 2));
  if (positiveQuoteWindows.length) {
    fs.appendFileSync(
      path.join(reports, 'cross-monitor-events.jsonl'),
      `${JSON.stringify(status)}\n`,
    );
  }
  console.log(
    `[${status.completedAt}] cycle=${cycle} signals=${status.grossSignalCount}`
    + ` probed=${status.probedCount} positive>=${minimumDeltaUsd}=${status.positiveQuoteWindowCount}`,
  );
}

let cycle = 0;
while (maxCycles === 0 || cycle < maxCycles) {
  cycle += 1;
  try {
    await runCycle(cycle);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] cycle=${cycle} error=${error.message}`);
    fs.mkdirSync(reports, { recursive: true });
    fs.writeFileSync(path.join(reports, 'cross-monitor-status.json'), JSON.stringify({
      cycle,
      completedAt: new Date().toISOString(),
      healthy: false,
      error: error.message,
    }, null, 2));
    if (maxCycles !== 0) process.exitCode = 1;
  }
  if (maxCycles !== 0 && cycle >= maxCycles) break;
  await pause(intervalMs);
}
