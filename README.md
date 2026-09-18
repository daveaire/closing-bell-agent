# Closing Bell Agent

Closing Bell Agent is a BNB Smart Chain execution gate for tokenized stocks. It compares bStocks and Ondo token prices with their underlying reference prices, normalizes issuer share ratios, checks whether the traditional market is open, obtains a real Binance Web3 API spot quote, builds unsigned swap calldata, and requires a successful transaction simulation before a candidate can reach human review.

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
