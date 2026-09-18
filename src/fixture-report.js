import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCandidate, normalizeRwaToken, rankCandidates } from './decision-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildFixtureReport() {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', name), 'utf8'));
  const tokens = read('rwa-tokens.json');
  const prices = read('rwa-prices.json');
  const now = 1779140000000;
  const priceByAddress = new Map(prices.data.map(row => [row.tokenContractAddress.toLowerCase(), row]));
  const policy = { maxPremiumBps: 75, maxPriceAgeMs: 120000 };
  const candidates = rankCandidates(tokens.data.map(token => evaluateCandidate(
    normalizeRwaToken(token, priceByAddress.get(token.tokenContractAddress.toLowerCase()), now),
    {}, policy,
  )));
  return {
    mode: 'fixture',
    generatedAt: new Date(now).toISOString(),
    chain: { id: 56, name: 'BNB Smart Chain' },
    policy,
    broadcastEnabled: false,
    candidates,
  };
}
