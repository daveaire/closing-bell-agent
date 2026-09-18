import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { BinanceWeb3Client } from './binance-client.js';

const USDT = '0x55d398326f99059fF775485246999027B3197955';
const DEFAULT_TARGET = '0x9e82e3da8f1115b73d24bb24113ab836ffdab6b6'; // SNXXB
const wallet = process.env.USER_WALLET_ADDRESS;
const target = process.env.TARGET_RWA_ADDRESS || DEFAULT_TARGET;
const amount = process.env.PROBE_AMOUNT_RAW || '5000000000000000000'; // 5 USDT on BSC
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'reports', 'live-route-probe.json');

if (!wallet) throw new Error('USER_WALLET_ADDRESS is required');

const client = new BinanceWeb3Client({
  apiKey: process.env.OC_API_KEY,
  secretKey: process.env.OC_SECRET_KEY,
});

const quoteStarted = performance.now();
const quoteResponse = await client.quote({
  amount,
  fromTokenAddress: USDT,
  toTokenAddress: target,
  userWalletAddress: wallet,
});
const quoteLatencyMs = Math.round(performance.now() - quoteStarted);
const routes = Array.isArray(quoteResponse.data) ? quoteResponse.data : [];
const route = routes[0];
if (!route) {
  const empty = { generatedAt: new Date().toISOString(), target, amount, routeCount: 0,
    quoteLatencyMs, broadcastEnabled: false };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(empty, null, 2));
  console.log(JSON.stringify(empty, null, 2));
  process.exit(0);
}

const buildStarted = performance.now();
const swapResponse = await client.buildSwap({
  amount,
  fromTokenAddress: USDT,
  toTokenAddress: target,
  quoteId: route.quoteId,
  userWalletAddress: wallet,
});
const buildLatencyMs = Math.round(performance.now() - buildStarted);
const built = swapResponse.data || {};
const evmTx = built.tx || built.swapTransaction || null;
let simulation = null;
let simulationLatencyMs = null;
if (evmTx?.to && evmTx?.data) {
  const simulationStarted = performance.now();
  simulation = (await client.simulate({
    from: evmTx.from || wallet,
    to: evmTx.to,
    value: String(evmTx.value || '0'),
    data: evmTx.data,
  })).data;
  simulationLatencyMs = Math.round(performance.now() - simulationStarted);
}

const result = {
  generatedAt: new Date().toISOString(),
  target,
  amount,
  routeCount: routes.length,
  latencyMs: { quote: quoteLatencyMs, build: buildLatencyMs, simulation: simulationLatencyMs },
  bestRoute: {
    vendorName: route.vendorName,
    toTokenAmount: route.toTokenAmount,
    tradeFeeUsd: route.tradeFee,
    priceImpactPercent: route.priceImpactPercent,
    fromHoneyPot: route.fromToken?.isHoneyPot ?? null,
    toHoneyPot: route.toToken?.isHoneyPot ?? null,
  },
  build: {
    executionMode: built.executionMode || null,
    hasEvmTransaction: Boolean(evmTx?.to && evmTx?.data),
    hasRfqTypedData: Boolean(built.rfq?.typedDataToSign),
    responseKeys: Object.keys(built).sort(),
  },
  simulation: simulation ? {
    status: simulation.status,
    failReason: simulation.failReason || null,
    balanceChangeCount: simulation.balanceChanges?.length || 0,
  } : null,
  broadcastEnabled: false,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
