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

## Pending credentialed observations

The following will be filled only after a Binance Web3 project key is issued:

- first authenticated request latency and response headers;
- live bStocks/Ondo token count on BSC;
- quote availability by vendor;
- transaction-simulation success and failure examples;
- rate-limit behavior and error clarity.

No latency or reliability claim is inferred from documentation examples.
