# Closing Bell Agent

Closing Bell Agent is a BNB Smart Chain execution gate for tokenized stocks. It compares bStocks and Ondo token prices with their underlying reference prices, normalizes issuer share ratios, checks whether the traditional market is open, obtains a real Binance Web3 API spot quote, builds unsigned swap calldata, and requires a successful transaction simulation before a candidate can reach human review.

It also compares bStock and Ondo representations of the same underlying share. A gross cross-issuer dislocation remains `BLOCK` until both inventory legs are quoted at the same normalized share exposure and the returned stablecoin exceeds the starting notional after execution costs.

The agent never broadcasts. Its product is a clear **BLOCK** or **REVIEW** decision with the exact failed gates.

## Why it exists

Tokenized stocks trade around the clock while the underlying stock market closes. A visible discount or premium can be stale, distorted by the token-to-share ratio, or impossible to execute at the displayed size. Closing Bell Agent makes these conditions visible before a wallet signs anything.

## Run the reproducible fixture

```sh
npm run check
npm run demo
```

## Run against Binance Web3 API

```sh
cp .env.example .env
# Add OC_API_KEY and OC_SECRET_KEY from the Binance Web3 developer portal.
set -a; source .env; set +a
npm run scan
```

The live scanner uses BSC mainnet only (`binanceChainId=56`) and supports the hackathon's bStocks/Ondo scope. The API client signs the exact raw request path, including the required `/build` prefix.

Run the cross-issuer discovery and then probe a signal at the default $500 size:

```sh
npm run scan:cross
npm run probe:cross
```

## Credentialed mainnet evidence

On 2026-09-18 UTC, an authenticated BSC scan returned 488 tokenized-stock candidates, including 364 whose underlying market was reported open. A read-only $5 USDT to SNXXB probe returned one LiquidMesh route, built unsigned EVM calldata, and reached the Transaction API simulation gate. Simulation failed because the test wallet had no BSC USDT, so the agent blocked the route and did not broadcast. The sanitized observation is committed in `fixtures/credentialed-observation.json`; credentials and wallet details are excluded.

A later scan found two ratio-normalized cross-issuer signals above 25 bps. At a $500 test size, QCOM showed 37.68 bps gross but executable quotes returned only $499.42; CBRS showed 29.53 bps gross and returned $498.82. Both buy and sell calldata legs were built, and both candidates were correctly blocked before signing. Sanitized evidence is committed under `reports/`.

## Execution policy

A candidate reaches `REVIEW` only when:

- token price and underlying reference price are fresh;
- token-to-share ratio is included in fair value;
- the underlying market is open;
- premium stays inside the configured policy;
- a real executable quote exists;
- price impact is at most 1%;
- unsigned swap calldata exists; and
- Binance Transaction API simulation returns `SUCCESS`.

Broadcasting is disabled in code. A wallet remains the final signer.
