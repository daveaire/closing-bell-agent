import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BinanceWeb3Client } from './binance-client.js';

const USDT = '0x55d398326f99059fF775485246999027B3197955';
const USDT_DECIMALS = 18;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spreadsPath = path.join(root, 'reports', 'cross-representation-spreads.json');
const wallet = process.env.USER_WALLET_ADDRESS;
const notionalUsd = Number(process.env.CROSS_PROBE_USD || 500);
const signalIndex = Number(process.env.CROSS_SIGNAL_INDEX || 0);

if (!wallet) throw new Error('USER_WALLET_ADDRESS is required');
if (!Number.isFinite(notionalUsd) || notionalUsd <= 0) throw new Error('CROSS_PROBE_USD must be positive');

const spreadReport = JSON.parse(fs.readFileSync(spreadsPath, 'utf8'));
const signal = spreadReport.spreads?.[signalIndex];
if (!signal) throw new Error('No cross-representation signal is available. Run npm run scan:cross first.');
const reportPath = path.join(
  root,
  'reports',
  `cross-route-probe-${signal.underlyingTicker.toLowerCase()}.json`,
);

const client = new BinanceWeb3Client({
  apiKey: process.env.OC_API_KEY,
  secretKey: process.env.OC_SECRET_KEY,
});
const tokens = (await client.listRwaTokens()).data;
const metadata = new Map(tokens.map(token => [token.tokenContractAddress.toLowerCase(), token]));
const buyToken = metadata.get(signal.buy.contract.toLowerCase());
const sellToken = metadata.get(signal.sell.contract.toLowerCase());
if (!buyToken || !sellToken) throw new Error('Signal token metadata is no longer available');

const toRaw = (amount, decimals) => BigInt(Math.floor(amount * (10 ** Math.min(decimals, 12))))
  * (10n ** BigInt(Math.max(0, decimals - 12)));
const fromRaw = (amount, decimals) => Number(amount) / (10 ** decimals);

const inputRaw = toRaw(notionalUsd, USDT_DECIMALS).toString();
const buyRoutes = (await client.quote({
  amount: inputRaw,
  fromTokenAddress: USDT,
  toTokenAddress: signal.buy.contract,
  userWalletAddress: wallet,
})).data ?? [];
const buyRoute = buyRoutes[0];

let result;
if (!buyRoute) {
  result = {
    generatedAt: new Date().toISOString(), signal, notionalUsd,
    decision: 'BLOCK', reasons: ['missing-buy-quote'], broadcastEnabled: false,
  };
} else {
  const boughtTokens = fromRaw(buyRoute.toTokenAmount, Number(buyToken.decimals));
  const acquiredShares = boughtTokens * Number(signal.buy.tokenToShareRatio);
  const equivalentSellTokens = acquiredShares / Number(signal.sell.tokenToShareRatio);
  const sellAmountRaw = toRaw(equivalentSellTokens, Number(sellToken.decimals)).toString();
  const sellRoutes = (await client.quote({
    amount: sellAmountRaw,
    fromTokenAddress: signal.sell.contract,
    toTokenAddress: USDT,
    userWalletAddress: wallet,
  })).data ?? [];
  const sellRoute = sellRoutes[0];

  if (!sellRoute) {
    result = {
      generatedAt: new Date().toISOString(), signal, notionalUsd,
      buyQuote: {
        vendor: buyRoute.vendorName,
        boughtTokens,
        acquiredShares,
        reportedNetworkFeeUsd: Number(buyRoute.tradeFee ?? 0),
        priceImpactPercent: Number(buyRoute.priceImpactPercent ?? 0),
      },
      decision: 'BLOCK', reasons: ['missing-sell-quote'], broadcastEnabled: false,
    };
  } else {
    const usdtOut = fromRaw(sellRoute.toTokenAmount, USDT_DECIMALS);
    const quoteImpliedDeltaUsd = usdtOut - notionalUsd;
    const [buyBuild, sellBuild] = await Promise.all([
      client.buildSwap({
        amount: inputRaw, fromTokenAddress: USDT, toTokenAddress: signal.buy.contract,
        quoteId: buyRoute.quoteId, userWalletAddress: wallet,
      }),
      client.buildSwap({
        amount: sellAmountRaw, fromTokenAddress: signal.sell.contract, toTokenAddress: USDT,
        quoteId: sellRoute.quoteId, userWalletAddress: wallet,
      }),
    ]);
    const buyTx = buyBuild.data?.tx || buyBuild.data?.swapTransaction;
    const sellTx = sellBuild.data?.tx || sellBuild.data?.swapTransaction;
    const reasons = [];
    if (quoteImpliedDeltaUsd <= 0) reasons.push('non-positive-quote-implied-delta');
    if (!buyTx?.to || !buyTx?.data) reasons.push('missing-buy-calldata');
    if (!sellTx?.to || !sellTx?.data) reasons.push('missing-sell-calldata');
    reasons.push('inventory-and-funded-simulation-required');
    result = {
      generatedAt: new Date().toISOString(),
      network: { name: 'BNB Smart Chain', chainId: 56 },
      underlyingTicker: signal.underlyingTicker,
      notionalUsd,
      indicatedGrossSpreadBps: signal.grossSpreadBps,
      buy: {
        symbol: signal.buy.symbol,
        platformId: signal.buy.platformId,
        vendor: buyRoute.vendorName,
        boughtTokens,
        acquiredShares,
        reportedNetworkFeeUsd: Number(buyRoute.tradeFee ?? 0),
        priceImpactPercent: Number(buyRoute.priceImpactPercent ?? 0),
        calldataBuilt: Boolean(buyTx?.to && buyTx?.data),
      },
      sell: {
        symbol: signal.sell.symbol,
        platformId: signal.sell.platformId,
        vendor: sellRoute.vendorName,
        equivalentSellTokens,
        usdtOut,
        reportedNetworkFeeUsd: Number(sellRoute.tradeFee ?? 0),
        priceImpactPercent: Number(sellRoute.priceImpactPercent ?? 0),
        calldataBuilt: Boolean(sellTx?.to && sellTx?.data),
      },
      quoteImpliedDeltaUsd,
      quoteImpliedDeltaBps: (quoteImpliedDeltaUsd / notionalUsd) * 10_000,
      decision: reasons.length ? 'BLOCK' : 'REVIEW',
      reasons,
      caveat: 'The two legs rotate economically equivalent share exposure between different issuers. They are not a closed conversion and require prefunded sell inventory, issuer-risk policy, gas accounting, and successful simulations.',
      broadcastEnabled: false,
    };
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
