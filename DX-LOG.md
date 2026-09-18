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
- A live $5 USDT → SNXXB quote returned one LiquidMesh route: estimated trade fee `$0.02079493`, price impact `0.0022806710%`, and no honeypot flags.
- The same quote built unsigned EVM calldata with `executionMode=SWAP`. This differs from the Trading API statement that equity/RWA tokens always return `RFQ`; at least this BStock/LiquidMesh route used the normal swap path.
- Transaction API simulation returned `FAILED` with `execution reverted: BEP20: transfer amount exceeds balance`, which is correct for the configured read-only wallet because it has no BSC USDT. Closing Bell Agent kept the candidate blocked and did not broadcast.
- The authenticated BSC scan returned 488 tokenized-stock candidates; 364 reported an open underlying market at the observation time.
- The latest route probe measured 785 ms for quote, 611 ms for transaction build, and 364 ms for simulation. These are single observations, not reliability or performance claims.

## Still unmeasured

- response headers and sustained rate-limit behavior;
- a successful funded transaction simulation;
- quote availability across multiple vendors and observation windows.

No reliability claim is inferred from this single credentialed observation.
