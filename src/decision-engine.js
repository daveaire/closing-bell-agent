function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeRwaToken(token, price, now = Date.now()) {
  const tokenPrice = finite(price?.tokenPrice ?? token.tokenPrice);
  const referencePrice = finite(price?.referencePrice ?? token.referencePrice);
  const ratio = finite(token.tokenToShareRatio) ?? 1;
  const ratioAdjustedReferencePrice = referencePrice === null ? null : referencePrice * ratio;
  const referenceDeltaBps = tokenPrice === null || !ratioAdjustedReferencePrice
    ? null
    : ((tokenPrice / ratioAdjustedReferencePrice) - 1) * 10_000;
  const priceTimestamp = finite(price?.tokenPriceUpdatedAt);
  return {
    symbol: token.tokenSymbol,
    underlyingTicker: token.underlyingTicker,
    platformId: token.platformId,
    contract: token.tokenContractAddress,
    decimals: Number(token.decimals),
    marketStatus: token.statusInfo?.marketStatus ?? 'unknown',
    marketOpen: Boolean(token.statusInfo?.openState),
    nextOpenTime: token.statusInfo?.nextOpenTime ?? null,
    tokenPrice,
    referencePrice,
    tokenToShareRatio: ratio,
    ratioAdjustedReferencePrice,
    referenceSource: 'binance-rwa-api-derived',
    referenceDeltaBps,
    priceTimestamp,
    priceAgeMs: priceTimestamp === null ? null : Math.max(0, now - priceTimestamp),
  };
}

export function evaluateCandidate(candidate, evidence = {}, policy = {}) {
  const maxPremiumBps = Number(policy.maxPremiumBps ?? 75);
  const maxPriceAgeMs = Number(policy.maxPriceAgeMs ?? 120_000);
  const reasons = [];
  if (candidate.tokenPrice === null || candidate.referencePrice === null) reasons.push('missing-price');
  if (candidate.priceAgeMs === null || candidate.priceAgeMs > maxPriceAgeMs) reasons.push('stale-price');
  if (!candidate.marketOpen) reasons.push('underlying-market-closed');
  if (candidate.referenceDeltaBps === null || Math.abs(candidate.referenceDeltaBps) > maxPremiumBps) reasons.push('reference-delta-outside-policy');
  if (!evidence.quote) reasons.push('missing-executable-quote');
  if (evidence.quote?.isHoneyPot) reasons.push('honeypot-risk');
  if (finite(evidence.quote?.priceImpactPercent) !== null
      && Math.abs(finite(evidence.quote.priceImpactPercent)) > 1) reasons.push('price-impact-over-1-percent');
  if (!evidence.swapBuilt) reasons.push('missing-swap-calldata');
  if (evidence.simulation?.status !== 'SUCCESS') reasons.push('simulation-not-successful');
  return {
    ...candidate,
    decision: reasons.length ? 'BLOCK' : 'REVIEW',
    reasons,
    quote: evidence.quote ?? null,
    simulation: evidence.simulation ?? null,
    broadcastEnabled: false,
  };
}

export function rankCandidates(rows) {
  return [...rows].sort((a, b) => {
    if (a.decision !== b.decision) return a.decision === 'REVIEW' ? -1 : 1;
    const aDelta = Math.abs(a.referenceDeltaBps ?? Infinity);
    const bDelta = Math.abs(b.referenceDeltaBps ?? Infinity);
    return aDelta - bDelta;
  });
}

export function findCrossRepresentationSpreads(rows, policy = {}) {
  const maxPriceAgeMs = Number(policy.maxPriceAgeMs ?? 120_000);
  const minimumGrossBps = Number(policy.minimumGrossBps ?? 0);
  const groups = new Map();

  for (const row of rows) {
    if (!row.underlyingTicker || row.tokenPrice === null || !row.tokenToShareRatio) continue;
    if (!row.marketOpen || row.priceAgeMs === null || row.priceAgeMs > maxPriceAgeMs) continue;
    const impliedSharePrice = row.tokenPrice / row.tokenToShareRatio;
    if (!Number.isFinite(impliedSharePrice) || impliedSharePrice <= 0) continue;
    const key = row.underlyingTicker.toUpperCase();
    const normalized = { ...row, impliedSharePrice };
    groups.set(key, [...(groups.get(key) ?? []), normalized]);
  }

  const spreads = [];
  for (const [underlyingTicker, representations] of groups) {
    for (let left = 0; left < representations.length; left += 1) {
      for (let right = left + 1; right < representations.length; right += 1) {
        const first = representations[left];
        const second = representations[right];
        if (first.platformId === second.platformId) continue;
        const [buy, sell] = first.impliedSharePrice <= second.impliedSharePrice
          ? [first, second]
          : [second, first];
        const grossSpreadBps = ((sell.impliedSharePrice / buy.impliedSharePrice) - 1) * 10_000;
        if (grossSpreadBps < minimumGrossBps) continue;
        spreads.push({
          underlyingTicker,
          grossSpreadBps,
          buy: {
            symbol: buy.symbol,
            platformId: buy.platformId,
            contract: buy.contract,
            tokenPrice: buy.tokenPrice,
            tokenToShareRatio: buy.tokenToShareRatio,
            impliedSharePrice: buy.impliedSharePrice,
          },
          sell: {
            symbol: sell.symbol,
            platformId: sell.platformId,
            contract: sell.contract,
            tokenPrice: sell.tokenPrice,
            tokenToShareRatio: sell.tokenToShareRatio,
            impliedSharePrice: sell.impliedSharePrice,
          },
          decision: 'QUOTE_REQUIRED',
        });
      }
    }
  }

  return spreads.sort((a, b) => b.grossSpreadBps - a.grossSpreadBps);
}
