/**
 * Live DNS + TLS (ALPN h2 / TLS 1.3) + HTTPS probes for SNI white-list domains.
 *
 * Faithful port of `showcase-site/tools/build-sni-pack.mjs` probe logic:
 *   · DNS A-resolution (dead domains never enter the scan)
 *   · bare TLS handshake with ALPN advertised → tls13 / alpn / ms
 *   · HTTPS status probe in forced HTTP/1.1 (HEAD → ranged GET → http/80 fallbacks)
 *   · IPv4 is forced via host=ip (VPN egress may have a dead v6 route)
 */
import dns from "node:dns";
import tls from "node:tls";
import https from "node:https";
import http from "node:http";

const TIMEOUT_MS = 9000;

export function isDomain(value) {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(String(value || "").trim().toLowerCase());
}

function tcp4(domain) {
  return dns.promises.lookup(domain, { family: 4 }).then((r) => (r && r.address ? r.address : null)).catch(() => null);
}

function tlsProbe(domain, ip, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (!ip) return resolve({ ok: false, tls13: false, alpn: "", ms: null });
    let done = false;
    let t0 = 0;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const sock = tls.connect({
      host: ip, servername: domain, port: 443,
      ALPNProtocols: ["h2", "http/1.1"], rejectUnauthorized: false, timeout: timeoutMs
    }, () => {
      finish({ ok: true, tls13: sock.getProtocol ? sock.getProtocol() === "TLSv1.3" : false, alpn: sock.alpnProtocol || "", ms: t0 ? Date.now() - t0 : null });
      try { sock.destroy(); } catch { /* noop */ }
    });
    sock.once("connect", () => { t0 = Date.now(); });
    sock.setTimeout(timeoutMs, () => { try { sock.destroy(); } catch { /* noop */ } finish({ ok: false, tls13: false, alpn: "", ms: null }); });
    sock.once("error", () => finish({ ok: false, tls13: false, alpn: "", ms: null }));
  });
}

function httpProbe(domain, ip, timeoutMs = 9000) {
  return new Promise((resolve) => {
    let t0 = Date.now(), settled = false;
    const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
    if (!ip) return finish({ ok: false, status: 0, ms: null });
    const attempt = (useTls, port) => new Promise((done) => {
      const mod = useTls ? https : http;
      const req = mod.request({
        host: ip, port, servername: useTls ? domain : undefined,
        path: "/", method: "HEAD",
        headers: {
          host: domain,
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          accept: "text/html,*/*"
        },
        timeout: timeoutMs
      }, (res) => {
        const out = { ok: true, status: Number(res.statusCode) || 0, ms: Date.now() - t0 };
        res.resume();
        res.on("end", () => { try { res.socket && res.socket.destroy(); } catch { /* noop */ } done(out); });
        done(out);
      });
      req.on("timeout", () => { req.destroy(); done(null); });
      req.on("error", () => done(null));
      req.end();
    });
    (async () => {
      let r = await attempt(true, 443);
      if (!r || !r.status) r = await attempt(true, 443);
      if (!r || !r.status) {
        const plain = await attempt(false, 80);
        if (plain && plain.status && !(plain.status >= 500 && plain.status < 600)) r = plain;
      }
      finish(r || { ok: false, status: 0, ms: null });
    })();
  });
}

export async function probeDomain(domain) {
  const ip = await tcp4(domain);
  if (!ip) return { domain, ok: false, tls13: false, alpn: "", ms: null, status: 0, tier: "input" };
  const tlsInfo = await tlsProbe(domain, ip);
  const httpInfo = await httpProbe(domain, ip);
  const ok = !!(httpInfo && httpInfo.status);
  return {
    domain,
    ok,
    tls13: ok ? !!tlsInfo.tls13 : false,
    alpn: ok ? (tlsInfo.alpn || "—") : "",
    ms: ok ? (tlsInfo.ms != null ? Math.round(tlsInfo.ms) : null) : null,
    status: ok ? httpInfo.status : 0,
    tier: "input"
  };
}

export async function runScan(domains, { concurrency = 12, timeoutSecs = 12 } = {}) {
  const unique = [...new Set((domains || []).map((d) => String(d).trim().toLowerCase()).filter(isDomain))];
  const results = [];
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next += 1;
      if (i > unique.length) return;
      results.push(await probeDomain(unique[i - 1]));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, unique.length)) }, worker));
  return results.sort((a, b) => a.domain.localeCompare(b.domain));
}
