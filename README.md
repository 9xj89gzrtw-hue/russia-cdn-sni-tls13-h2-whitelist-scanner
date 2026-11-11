# russia-cdn-sni-tls13-h2-whitelist-scanner

Apify Actor + local Node scanner that measures **TLS 1.3 + ALPN h2 readiness** of Russian
CDN / white-list SNI domains and judges **VLESS Reality / XHTTP** compatibility.

Part of the TW1 toolkit:

- Storefront: https://9xj89gzrtw-hue.github.io/net-whitelist/
- Telegram chats / SNI pack: https://9xj89gzrtw-hue.github.io/tg-chats/
- Plati.Market Pro lot (white-list base + generator, 99 ₽): lot `6390371`
  — https://plati.market/itm/vless-reality-happ-amneziawg-1384-white-list-sni-domains-lte-ru-2026-config/6390371
- WB / Ozon margin + competitor export Actor: `wildberry-ozon-competitor-and-margin-extractor`

## What one run does

1. Scans up to N user-supplied SNI domains via live DNS A + bare TLS handshake
   (ALPN `h2`, `http/1.1`) + HTTPS status probe (HEAD → ranged GET → plain http/80 fallback).
2. Emits one dataset row per domain: `ok`, `tls13`, `alpn`, `ping_ms`, `https_status`,
   `compatibility` (e.g. `VLESS Reality / XHTTP ready (TLS1.3 + h2)`).
3. Emits the free **25-domain demo slice** of the full verified base (1,384 domains,
   919 with TLS 1.3, 976 with ALPN h2, real ping_ms measurements — November 2026).
4. Emits the Pro offer record: full base + generator + Plati checkout (lot `6390371`).

## Quick start

```bash
npx apify run russia-cdn-sni-tls13-h2-whitelist-scanner -i '{"domains":["gosuslugi.ru","mos.ru"]}'
```

Locally (same code powers the Actor):

```bash
node src/main.js --domains gosuslugi.ru,mos.ru --no-offer --no-demo
```

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `domains` | string[] | `[]` | SNI domains to scan (deduped, validated). |
| `includeDemoSample` | boolean | `true` | Include the free 25-domain demo slice. |
| `includeOffer` | boolean | `true` | Include the Pro offer record. |
| `concurrency` | int | `12` | Parallel probe sockets (12 is the measured sweet spot). |
| `timeoutSecs` | int | `12` | Probe timeout. |

## Output

- Dataset rows: scanned domains with TLS/HTTPS verdicts + demo + offer.
- Value key: `SUMMARY` with `scanned`, `ok`, `tls13_ok`, `alpn_h2_ok`, `dead`, `demo_domains_returned`.
- CSV export available via `?format=csv`.

## Honest scope

Each pack row is a live DNS + TLS + HTTPS probe (November 2026). Whether an operator
actually accepts the SNI in its LTE white-list is decided by the operator; the page and
the Pro key cover it.
