import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidate, normalizeRwaToken } from '../src/decision-engine.js';

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
