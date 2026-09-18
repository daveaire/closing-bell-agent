import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BinanceWeb3Client } from './binance-client.js';
import { findCrossRepresentationSpreads, normalizeRwaToken } from './decision-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportFilename = process.env.CROSS_SCAN_OUTPUT_FILE || 'cross-representation-spreads.json';
if (path.basename(reportFilename) !== reportFilename) throw new Error('CROSS_SCAN_OUTPUT_FILE must be a filename');
const reportPath = path.join(root, 'reports', reportFilename);
const batchSize = Number(process.env.RWA_PRICE_BATCH_SIZE || 20);
const maxPriceAgeMs = Number(process.env.MAX_PRICE_AGE_MS || 120_000);
const minimumGrossBps = Number(process.env.MIN_CROSS_SPREAD_BPS || 25);

const client = new BinanceWeb3Client({
  apiKey: process.env.OC_API_KEY,
  secretKey: process.env.OC_SECRET_KEY,
});

const tokenResponse = await client.listRwaTokens();
const tokens = tokenResponse.data;
const priceRows = [];
for (let index = 0; index < tokens.length; index += batchSize) {
  const addresses = tokens.slice(index, index + batchSize).map(token => token.tokenContractAddress);
  const response = await client.getRwaPrices(addresses);
  priceRows.push(...response.data);
}

const now = Date.now();
const priceByAddress = new Map(
  priceRows.map(row => [row.tokenContractAddress.toLowerCase(), row]),
);
const normalized = tokens.map(token => normalizeRwaToken(
  token,
  priceByAddress.get(token.tokenContractAddress.toLowerCase()),
  now,
));
const spreads = findCrossRepresentationSpreads(normalized, { maxPriceAgeMs, minimumGrossBps });
const report = {
  generatedAt: new Date(now).toISOString(),
  network: { name: 'BNB Smart Chain', chainId: 56 },
  sourceCandidateCount: tokens.length,
  policy: { maxPriceAgeMs, minimumGrossBps },
  caveat: 'Gross normalized dislocations only. Both sell and buy legs require inventory, executable quotes, fee accounting, calldata construction, and successful simulation before review.',
  spreadCount: spreads.length,
  spreads: spreads.slice(0, 25),
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
