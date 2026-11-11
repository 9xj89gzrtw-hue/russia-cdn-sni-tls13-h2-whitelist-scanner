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
  await Actor.init();
  try {
    const input = (await Actor.getInput()) || {};
    const summary = await run(input, (row) => Actor.pushData(row));
    console.log("run summary:", JSON.stringify(summary, null, 2));
    await Actor.setValue("SUMMARY", summary);
  } finally {
    await Actor.exit();
  }
}

const isActor = Boolean(process.env.APIFY_IS_AT_HOME || process.env.ACTOR_ID || process.env.APIFY_TOKEN);
(isActor ? actorMain : localMain()).catch((err) => {
  console.error(err);
  process.exit(1);
});
