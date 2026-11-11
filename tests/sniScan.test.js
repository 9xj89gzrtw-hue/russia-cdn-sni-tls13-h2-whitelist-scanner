import assert from "node:assert";
import { test } from "node:test";
import { runScan } from "../src/sniScan.js";

test("scanner probes TLS 1.3 + ALPN h2 + HTTPS on a live SNI", async () => {
  const rows = await runScan(["gosuslugi.ru", "mos.ru"], { concurrency: 2, timeoutSecs: 12 });
  assert.equal(rows.length, 2);
  const byDomain = Object.fromEntries(rows.map((r) => [r.domain, r]));
  for (const name of ["gosuslugi.ru", "mos.ru"]) {
    assert.ok(byDomain[name].ok, `${name} must answer HTTPS`);
    assert.ok(byDomain[name].tls13, `${name} must negotiate TLS 1.3`);
    assert.equal(byDomain[name].alpn, "h2", `${name} must negotiate ALPN h2`);
    assert.ok(byDomain[name].ms > 0, `${name} must be timed`);
  }
});

test("scanner rejects invalid domains", async () => {
  const rows = await runScan(["not a domain !!", ""], { concurrency: 1, timeoutSecs: 12 });
  assert.deepEqual(rows, []);
});
