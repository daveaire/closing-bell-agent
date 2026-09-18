# Binance Web3 API developer experience log

This is a working lab notebook. It records only behavior actually observed while building Closing Bell Agent.

## 2026-09-19 — documentation and local implementation

- The API uses `https://web3.binance.com/build` as its base URL.
- The signed `requestPath` must include `/build`; omitting it is documented as the most common `40102` cause. The client enforces this invariant and has a regression test.
- GET query parameters must retain their exact raw encoding and order between signing and transmission. The client builds the query once and reuses it for both.
- RWA discovery, RWA price, aggregated quote, swap construction, and transaction simulation are separate endpoints. This separation makes the safety gate easy to audit, but a first integration requires careful schema navigation.
- RWA quotes require `userWalletAddress`, even when the application only intends to build unsigned calldata.
- The API documentation clearly exposes `tokenToShareRatio`, market-open status, reference price, quote price impact, and simulation balance changes. These fields are sufficient for a useful pre-signing decision product.
- Local validation on 2026-09-19: 5 tests passed, including signing-path parity, query encoding, issuer ratio normalization, market-closed rejection, and simulation-gated review.

## 2026-09-19 — first authenticated request

- A project key with Market, Trade, Transaction, Wallet, B402 Payments, and DeFi permissions was created in the Binance Web3 developer portal.
- The first authenticated token-list request succeeded, but the immediate price request failed with HTTP `414` because the client placed 100 comma-separated contract addresses in the signed GET URL.
- The RWA price documentation permits at most 100 addresses, but that documented maximum exceeded the effective request-target limit in this route. The client now filters the token list to BSC before pricing and defaults to 20-address batches.
- The failure response body did not contain a Binance business `msg`, so the client could report only `Binance Web3 API 414: request failed`. A structured error for proxy-level failures would make the limit easier to diagnose.
- After batching, the authenticated BSC token and price scan completed successfully.
- A live $5 USDT → SNXXB quote returned one LiquidMesh route: the response field named `tradeFee` was `$0.02079493`, price impact was `0.0022806710%`, and there were no honeypot flags. The current docs describe `tradeFee` as an estimated network fee in USD, so the project labels it that way despite the field name.
- The same quote built unsigned EVM calldata with `executionMode=SWAP`. This differs from the Trading API statement that equity/RWA tokens always return `RFQ`; at least this BStock/LiquidMesh route used the normal swap path.
- Transaction API simulation returned `FAILED` with `execution reverted: BEP20: transfer amount exceeds balance`, which is correct for the configured read-only wallet because it has no BSC USDT. Closing Bell Agent kept the candidate blocked and did not broadcast.
- The authenticated BSC scan returned 488 tokenized-stock candidates; 364 reported an open underlying market at the observation time.
- The integrated decision probe discovered and priced SNXXB, obtained a real quote, built unsigned calldata, simulated it, and passed the evidence into the same policy engine used by the dashboard. It returned `BLOCK` with only `simulation-not-successful`; price freshness, the open market, ratio-adjusted API reference, reference-delta policy, honeypot checks, price impact, quote, and calldata gates all passed.
- That probe measured 1,525 ms for discovery and target pricing, 343 ms for quote, 328 ms for transaction build, and 481 ms for simulation. These are single observations, not reliability or performance claims.

## Still unmeasured

- response headers and sustained rate-limit behavior;
- a successful funded transaction simulation;
- quote availability across multiple vendors and observation windows.

No reliability claim is inferred from this single credentialed observation.

## 2026-09-18 — cross-issuer execution probes

- A fresh 488-candidate scan found only two open-market, fresh-price bStock/Ondo pairs with a ratio-normalized gross spread above 25 bps: QCOM at 37.68 bps and CBRS at 29.53 bps.
- Correct normalization matters in both directions. `tokenPrice / tokenToShareRatio` compares implied per-share prices; an inventory rotation multiplies purchased tokens by the buy issuer's ratio and divides the resulting share exposure by the sell issuer's ratio.
- Binance Aggregator produced LiquidMesh quotes and unsigned calldata for both legs of both $500 probes.
- The latest committed executable probes returned `$499.68` USDT for QCOM and `$499.04` for CBRS, both before gas. Closing Bell Agent rejected both instead of promoting the displayed gross spread as profit.
- The API-reported `tradeFee` values were small relative to the total quote deterioration, so judging profitability from that field alone would have been misleading. Comparing complete input and output amounts across both legs produced the useful decision.

## Documentation contradictions captured for the report

- `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/trading-api`, `executionMode`: the page says equity/RWA tokens always return `RFQ`. The live BSC `USDT → SNXXB` LiquidMesh route returned `executionMode=SWAP`, an EVM `tx`, and no RFQ typed data.
- `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/transaction-api`, `Simulate Transactions` example: the example response shows `status: SUCCESS` together with `failReason: execution reverted: ERC20InsufficientBalance`. A successful status should have `failReason: null`, or the status should be `FAILED`.
- `https://web3.binance.com/en/dev-docs/catalog/web3-wallet/api/rest-api/rwa-data`, `Get RWA Token Price`: the documented maximum of 100 comma-separated addresses produced HTTP `414` at the effective request-target layer. Batches of 20 worked. The page should publish a safe URI-length limit or offer a POST batch endpoint.
- The RWA page now describes `referencePrice` as a per-share value derived from the onchain token price, not an official traditional-market quote. That caveat is material for any apparent premium/discount product and should appear beside every response example, not only in field-level reference text.
