import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BinanceWeb3Client } from './binance-client.js';
import { evaluateCandidate, normalizeRwaToken, rankCandidates } from './decision-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureMode = process.argv.includes('--fixture');
const readFixture = name => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', name), 'utf8'));

async function loadData() {
  if (fixtureMode) return { tokens: readFixture('rwa-tokens.json'), prices: readFixture('rwa-prices.json') };
  const client = new BinanceWeb3Client({
    apiKey: process.env.OC_API_KEY,
    secretKey: process.env.OC_SECRET_KEY,
  });
  const tokens = await client.listRwaTokens();
  const addresses = tokens.data.map(token => token.tokenContractAddress);
  const batches = [];
  const batchSize = Number(process.env.RWA_PRICE_BATCH_SIZE || 20);
  for (let index = 0; index < addresses.length; index += batchSize) {
    batches.push(addresses.slice(index, index + batchSize));
  }
  const priceResponses = [];
  for (const batch of batches) priceResponses.push(await client.getRwaPrices(batch));
  return {
    tokens,
    prices: { code: 0, success: true, data: priceResponses.flatMap(response => response.data) },
  };
}

const { tokens, prices } = await loadData();
const now = fixtureMode ? 1779140000000 : Date.now();
const priceByAddress = new Map(prices.data.map(row => [row.tokenContractAddress.toLowerCase(), row]));
const policy = {
  maxPremiumBps: Number(process.env.MAX_PREMIUM_BPS || 75),
  maxPriceAgeMs: Number(process.env.MAX_PRICE_AGE_MS || 120000),
};
const rows = rankCandidates(tokens.data.map(token => {
  const price = priceByAddress.get(token.tokenContractAddress.toLowerCase());
  return evaluateCandidate(normalizeRwaToken(token, price, now), {}, policy);
}));
console.log(JSON.stringify({
  mode: fixtureMode ? 'fixture' : 'live',
  generatedAt: new Date(now).toISOString(),
  chain: { id: 56, name: 'BNB Smart Chain' },
  policy,
  broadcastEnabled: false,
  candidates: rows,
}, null, 2));
