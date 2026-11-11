/**
 * One run = scan Russian CDN / white-list SNI domains for TLS 1.3 + ALPN h2
 * readiness and VLESS Reality / XHTTP compatibility.
 *
 * Kept free of `apify` imports so the exact same code powers the Actor, the
 * local CLI and unit tests on a laptop.
 */
import fs from "node:fs";
import { runScan } from "./sniScan.js";
import { OFFER, offerLine } from "./offer.js";

const demoFile = new URL("./demo-domains.json", import.meta.url);
const DEMO = JSON.parse(fs.readFileSync(demoFile, "utf8"));

export function demoSample({ topics = [], minPingMs = 0 } = {}) {
  const wanted = topics.map((t) => String(t).toLowerCase());
  return DEMO.domains
    .filter((d) => (wanted.length ? wanted.includes(String(d.topic || "").toLowerCase()) : true)
      && (minPingMs ? Number(d.ping_ms) >= minPingMs : true))
    .map((d) => ({
      input: d.domain,
      domain: d.domain,
      category: d.category,
      ok: d.ok,
      tls13: d.tls13,
      alpn: d.alpn,
      ping_ms: d.ping_ms,
      https_status: d.https_status,
      recommended_client: d.recommended_client,
      source: "demo",
      fullBaseUrl: OFFER.storeUrl,
      offer: offerLine()
    }));
}

export function offerRecord() {
  return {
    _type: "offer",
    product: OFFER.product,
    code: OFFER.code,
    price_rub: OFFER.priceRub,
    demoDomains: OFFER.demoDomains,
    totalDomains: OFFER.totalDomains,
    store_url: OFFER.storeUrl,
    checkout_url: OFFER.checkoutUrl,
    plati_url: OFFER.platiUrl,
    delivery: OFFER.delivery,
    free: OFFER.freeFeatures,
    paid: OFFER.paidFeatures,
    note: offerLine()
  };
}

/**
 * Scan a batch of domains. `push` receives each dataset record in order.
 * Returns a small summary that is also printed to the Actor log.
 */
export async function run(input = {}, push = async () => {}) {
  const domains = Array.isArray(input.domains) ? input.domains.map((d) => String(d).trim().toLowerCase()).filter(Boolean) : [];
  const concurrency = Number(input.concurrency) || 12;
  const timeoutSecs = Number(input.requestTimeoutSecs) || 12;
  const includeDemoSample = input.includeDemoSample !== false;
  const includeOffer = input.includeOffer !== false;
  const minTls13 = Number(input.minTls13) || 0;
  const minAlpnH2 = Number(input.minAlpnH2) || 0;

  let scanned = 0;
  let ok = 0;
  let tls13ok = 0;
  let h2ok = 0;
  let dead = 0;

  const rows = await runScan(domains, { concurrency, timeoutSecs });

  for (const row of rows) {
    scanned += 1;
    if (row.ok) ok += 1;
    if (row.tls13) tls13ok += 1;
    if (row.alpn === "h2") h2ok += 1;
    if (!row.ok) dead += 1;
    await push({
      domain: row.domain,
      ok: row.ok,
      tls13: row.tls13,
      alpn: row.alpn,
      ping_ms: row.ping_ms,
      https_status: row.status,
      tier: row.tier || "demo",
      source: row.source || "input",
      compatibility:
        row.ok && row.tls13 && row.alpn === "h2"
          ? "VLESS Reality / XHTTP ready (TLS1.3 + h2)"
          : row.ok
            ? "TLS reachable, ALPN not h2"
            : "dead: no TLS/HTTPS handshake",
      offer: offerLine()
    });
  }

  let demoPushed = 0;
  if (includeDemoSample) {
    for (const chat of demoSample({})) {
      demoPushed += 1;
      await push(chat);
    }
  }

  if (includeOffer) {
    await push(offerRecord());
  }

  const summary = {
    scanned,
    ok,
    tls13_ok: tls13ok,
    alpn_h2_ok: h2ok,
    dead,
    demo_domains_returned: demoPushed,
    full_base: OFFER.storeUrl,
    offer: offerLine()
  };
  return summary;
}
