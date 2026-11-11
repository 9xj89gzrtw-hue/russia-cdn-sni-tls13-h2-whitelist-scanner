/**
 * Single source of truth for the paid offer (SNI white-list Pro, lot 6390371).
 *
 * The scanner hands out a free demo slice and points buyers at the Pro key —
 * the same line is used by the Actor dataset, the README and the storefront.
 */
export const OFFER = {
  product: "SNI White-List Pro for VLESS / Reality / XHTTP — 1,384 verified CDN domains",
  code: "TW1-SNI",
  priceRub: 99,
  demoDomains: 25,
  totalDomains: 1384,
  storeUrl: "https://9xj89gzrtw-hue.github.io/net-whitelist/",
  checkoutUrl: "https://oplata.info/asp2/pay_wm.asp?id_d=6390371&ai=1481449&lang=ru-RU",
  platiUrl: "https://plati.market/itm/vless-reality-happ-amneziawg-1384-white-list-sni-domains-lte-ru-2026-config/6390371",
  platiLotId: 6390371,
  seller: "danilaonly (Plati.Market ID 1481449)",
  delivery: "Instant TW1-SNI-… key on the order page right after SBP / RU card payment.",
  freeFeatures: [
    "25-domain demo slice with TLS 1.3 / ALPN h2 / ping measurements",
    "VLESS Reality / XHTTP / Sing-Box / 3x-ui inbound templates",
    "batch generation of 50 reserve profiles in 1 click"
  ],
  paidFeatures: [
    "Full base of 1,384 verified SNI white-list domains for LTE Russia (MTS, Megafon, Beeline, T2)",
    "TLS 1.3 + ALPN h2 measurements with real ping_ms, operator white-list classification",
    "Excel / CSV / JSON export of the full verified base",
    "lifetime key, no subscription"
  ]
};

export function offerLine() {
  return (
    `Free demo: ${OFFER.demoDomains} of ${OFFER.totalDomains} verified SNI domains. ` +
    `Full base + generator (${OFFER.code}, ${OFFER.priceRub} RUB): ${OFFER.storeUrl} ` +
    `| Plati.Market: ${OFFER.platiUrl}`
  );
}
