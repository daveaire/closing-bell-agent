function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeRwaToken(token, price, now = Date.now()) {
  const tokenPrice = finite(price?.tokenPrice ?? token.tokenPrice);
  const referencePrice = finite(price?.referencePrice ?? token.referencePrice);
  const ratio = finite(token.tokenToShareRatio) ?? 1;
  const fairTokenPrice = referencePrice === null ? null : referencePrice * ratio;
  const premiumBps = tokenPrice === null || !fairTokenPrice
    ? null
    : ((tokenPrice / fairTokenPrice) - 1) * 10_000;
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
    fairTokenPrice,
    premiumBps,
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
  if (candidate.premiumBps === null || Math.abs(candidate.premiumBps) > maxPremiumBps) reasons.push('premium-outside-policy');
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
    const aPremium = Math.abs(a.premiumBps ?? Infinity);
    const bPremium = Math.abs(b.premiumBps ?? Infinity);
    return aPremium - bPremium;
  });
}
