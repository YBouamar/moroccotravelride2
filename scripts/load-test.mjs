#!/usr/bin/env node
/**
 * Light load test (Phase 7), no dependency: `node scripts/load-test.mjs [baseUrl] [seconds] [concurrency]`.
 * Hits the public pages in a loop and reports throughput, latency percentiles and errors.
 * Run it against a production build (`pnpm --filter @mtr/web build && pnpm --filter @mtr/web start`)
 * or staging, never against production without warning. The search is rate limited per IP
 * (60 per minute): throttled answers are still HTTP 200 and are counted as such.
 */

const [baseUrl = 'http://localhost:3000', seconds = '30', concurrency = '20'] =
  process.argv.slice(2);
const PATHS = [
  '/fr',
  '/en',
  '/ar',
  '/fr/transfers/casablanca',
  '/fr/transfers/marrakech',
  '/fr/legal/terms',
];

const durations = [];
const statuses = new Map();
let errors = 0;
const deadline = Date.now() + Number(seconds) * 1000;

async function worker(index) {
  let round = index;
  while (Date.now() < deadline) {
    const path = PATHS[round % PATHS.length];
    round += 1;
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
      await response.arrayBuffer();
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    } catch {
      errors += 1;
    }
    durations.push(performance.now() - started);
  }
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

await Promise.all(Array.from({ length: Number(concurrency) }, (_, index) => worker(index)));
const sorted = [...durations].sort((a, b) => a - b);
const total = durations.length;
// eslint-disable-next-line no-console -- command-line tool: the report is its output.
console.log(
  JSON.stringify(
    {
      baseUrl,
      seconds: Number(seconds),
      concurrency: Number(concurrency),
      requests: total,
      requestsPerSecond: Number((total / Number(seconds)).toFixed(1)),
      latencyMs: {
        p50: Math.round(percentile(sorted, 50)),
        p95: Math.round(percentile(sorted, 95)),
        p99: Math.round(percentile(sorted, 99)),
        max: Math.round(sorted.at(-1) ?? 0),
      },
      statuses: Object.fromEntries(statuses),
      networkErrors: errors,
    },
    null,
    2,
  ),
);
