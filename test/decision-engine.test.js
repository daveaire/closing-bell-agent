import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCandidate,
  findCrossRepresentationSpreads,
  normalizeRwaToken,
} from '../src/decision-engine.js';

const token = {
  tokenSymbol: 'TESTon', underlyingTicker: 'TEST', platformId: 'ondo',
  tokenContractAddress: '0x0000000000000000000000000000000000000001', decimals: 18,
  tokenToShareRatio: '1.01', statusInfo: { openState: true, marketStatus: 'regular' },
};

test('fair price includes issuer token-to-share ratio', () => {
  const row = normalizeRwaToken(token, { tokenPrice: '101', referencePrice: '100', tokenPriceUpdatedAt: 99000 }, 100000);
  assert.equal(row.fairTokenPrice, 101);
  assert.equal(row.premiumBps, 0);
});

test('closed market, absent quote, and absent simulation are explicit blockers', () => {
  const row = normalizeRwaToken(
    { ...token, statusInfo: { openState: false, marketStatus: 'closed' } },
    { tokenPrice: '101', referencePrice: '100', tokenPriceUpdatedAt: 99000 }, 100000,
  );
  const decision = evaluateCandidate(row);
  assert.equal(decision.decision, 'BLOCK');
  assert.ok(decision.reasons.includes('underlying-market-closed'));
  assert.ok(decision.reasons.includes('missing-executable-quote'));
  assert.ok(decision.reasons.includes('simulation-not-successful'));
});

test('fresh, fairly priced, quoted and simulated route reaches human review', () => {
  const row = normalizeRwaToken(token, { tokenPrice: '101', referencePrice: '100', tokenPriceUpdatedAt: 99000 }, 100000);
  const decision = evaluateCandidate(row, {
    quote: { priceImpactPercent: '-0.05', isHoneyPot: false },
    swapBuilt: true,
    simulation: { status: 'SUCCESS' },
  });
  assert.equal(decision.decision, 'REVIEW');
  assert.deepEqual(decision.reasons, []);
  assert.equal(decision.broadcastEnabled, false);
});

test('cross-representation spreads normalize different issuer share ratios', () => {
  const common = {
    underlyingTicker: 'ACME', marketOpen: true, priceAgeMs: 1_000,
    referencePrice: 100, fairTokenPrice: 100, premiumBps: 0,
  };
  const spreads = findCrossRepresentationSpreads([
    { ...common, symbol: 'ACMEon', platformId: 'ondo', contract: '0x1', tokenPrice: 50, tokenToShareRatio: 0.5 },
    { ...common, symbol: 'ACMEx', platformId: 'xstocks', contract: '0x2', tokenPrice: 102, tokenToShareRatio: 1 },
  ], { minimumGrossBps: 25 });

  assert.equal(spreads.length, 1);
  assert.equal(spreads[0].buy.symbol, 'ACMEon');
  assert.equal(spreads[0].sell.symbol, 'ACMEx');
  assert.ok(Math.abs(spreads[0].grossSpreadBps - 200) < 1e-9);
  assert.equal(spreads[0].decision, 'QUOTE_REQUIRED');
});
