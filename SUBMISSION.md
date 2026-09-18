# BNB Chain Tokenized Stocks Hackathon submission

## Project

**Name:** Closing Bell Agent

**Track:** Main track — tokenized stocks on BSC

**Special prize fit:** Best Use of Agentic Wallet / Wallet Skills

**Concept:** A pre-signing execution gate that makes the underlying market clock, issuer share ratio, same-stock cross-issuer dislocations, executable spot quotes, price impact, and transaction simulation visible before a tokenized-stock trade reaches a wallet.

## Problem and behavior

Tokenized stocks trade when traditional markets are closed. A displayed discount can come from an API-derived reference field, a token-to-share conversion, stale data, or shallow execution. Closing Bell Agent uses Binance Web3 API RWA data only for screening, then uses BSC spot routing to convert that screen signal into a reviewable decision.

A candidate is `BLOCK` until all evidence gates pass. A candidate becomes `REVIEW` only after live price freshness, open underlying market, policy-compliant premium, executable quote, unsigned swap construction, and a `SUCCESS` Transaction API simulation. Broadcasting is disabled.

## 90-second demo

1. Open the dashboard and show SEDGon at $61.89 versus its ratio-adjusted API reference near $61.97.
2. Show that the apparent discount is only about 13.7 bps after applying `tokenToShareRatio`.
3. Point to `underlying-market-closed`; the agent will not treat a frozen reference as an entry signal.
4. Show the remaining quote, calldata, and simulation gates.
5. Switch to live mode with Binance credentials, select a BSC RWA, obtain the aggregated quote, build unsigned calldata, and simulate.
6. Close on the wallet boundary: `REVIEW` still does not broadcast; the user remains the signer.
7. Show QCOM and CBRS: both appeared profitable before routing, but two-leg $500 quotes returned less USDT than the starting notional, so the agent blocked them.

## Validation

- Six focused tests pass.
- The HMAC test proves the signed path contains the required `/build` prefix.
- The ratio-adjusted-reference test proves the issuer ratio is applied.
- The policy tests prove market closure and failed simulation block a trade.
- The bundled dashboard runs without credentials using the documented SEDGon fixture.
- An authenticated BSC scan returned 488 tokenized-stock candidates, 364 with the underlying market reported open.
- A live $5 USDT to SNXXB probe returned a LiquidMesh quote and unsigned `SWAP` calldata.
- Transaction simulation correctly blocked the unfunded test wallet with an insufficient-balance revert; no signature or broadcast occurred.
- A 488-candidate live scan found two fresh cross-issuer signals above 25 bps. The latest ratio-normalized $500 two-leg probes built calldata for both legs but rejected QCOM (`$499.68` out) and CBRS (`$499.04` out) because neither produced positive executable proceeds before gas.

## Remaining account-bound work

1. Register for the hackathon.
2. Publish the public repository and optional four-minute demo.
3. Submit before 2026-10-11.
