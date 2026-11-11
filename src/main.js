/**
 * Entry point.
 *
 * On Apify it runs as an Actor; locally the same file runs as a plain CLI so
 * the scanner can be smoke-tested without uploading anything:
 *
 *   node src/main.js --domains gosuslugi.ru,mos.ru --no-offer --no-demo
 *   node src/main.js --input input.json --out result.json
 */
import fs from "node:fs";
import { run, offerRecord } from "./run.js";

function parseArgs(argv) {
  const args = { domains: [], includeDemoSample: true, includeOffer: true };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--domains" && next) { args.domains.push(...next.split(",")); i += 1; }
    else if (key === "--input" && next) { args.input = next; i += 1; }
    else if (key === "--out" && next) { args.out = next; i += 1; }
    else if (key === "--no-demo") { args.includeDemoSample = false; }
    else if (key === "--no-offer") { args.includeOffer = false; }
    else if (key === "--min-tls13") { args.minTls13 = Number(next) || 0; i += 1; }
    else if (key === "--min-alpn-h2") { args.minAlpnH2 = Number(next) || 0; i += 1; }
    else if (key === "--concurrency" && next) { args.concurrency = Number(next) || 12; i += 1; }
    else if (key === "--timeout-secs" && next) { args.requestTimeoutSecs = Number(next) || 12; i += 1; }
  }
  return args;
}

async function localMain() {
  const args = parseArgs(process.argv);
  const input = args.input
    ? { ...JSON.parse(fs.readFileSync(args.input, "utf8")), ...args }
    : args;
  const summary = await run(input, async () => {});
  process.stdout.write(JSON.stringify({ summary, offer: offerRecord() }, null, 2) + "\n");
}

async function actorMain() {
  const { Actor } = await import("apify");
  console.log("[sni] actor runtime detected, init start");
  await Actor.init();
  console.log("[sni] apify initialised, reading input");
  try {
    const input = (await Actor.getInput()) || {};
    console.log(`[sni] input keys: ${Object.keys(input).join(", ") || "(none)"}`);
    let pushed = 0;
    // Heartbeat: keeps the event loop alive and makes a stuck probe visible
    // in the run log instead of a silent exit.
    const heartbeat = setInterval(() => console.log(`[sni] alive, rows pushed: ${pushed}`), 10000);
    let summary;
    try {
      summary = await run(input, async (row) => {
        await Actor.pushData(row);
        pushed += 1;
      });
    } finally {
      clearInterval(heartbeat);
    }
    console.log(`[sni] scan done, rows pushed: ${pushed}`);
    console.log("[sni] run summary:", JSON.stringify(summary));
    await Actor.setValue("SUMMARY", summary);
    console.log("[sni] SUMMARY stored");
  } catch (err) {
    console.error("[sni] actor failed:", err && err.stack ? err.stack : err);
    throw err;
  } finally {
    await Actor.exit();
    console.log("[sni] actor exited");
  }
}

const isActor = Boolean(process.env.APIFY_IS_AT_HOME || process.env.ACTOR_ID || process.env.APIFY_TOKEN);
process.on("unhandledRejection", (reason) => {
  console.error("[sni] unhandled rejection:", reason && reason.stack ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("[sni] uncaught exception:", err && err.stack ? err.stack : err);
});
(isActor ? actorMain() : localMain()).catch((err) => {
  console.error(err);
  process.exit(1);
});
