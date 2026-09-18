# BNB Chain Tokenized Stocks Hackathon submission

## Project

**Name:** Closing Bell Agent

**Track:** Main track — tokenized stocks on BSC

**Special prize fit:** Best Use of Agentic Wallet / Wallet Skills

**Concept:** A pre-signing execution gate that makes the underlying market clock, issuer share ratio, executable spot quote, price impact, and transaction simulation visible before a tokenized-stock trade reaches a wallet.

## Problem and behavior

Tokenized stocks trade when traditional markets are closed. A displayed discount can come from a frozen reference price, a token-to-share conversion, stale data, or shallow execution. Closing Bell Agent uses Binance Web3 API RWA data and BSC spot routing to convert that screen price into a reviewable decision.

A candidate is `BLOCK` until all evidence gates pass. A candidate becomes `REVIEW` only after live price freshness, open underlying market, policy-compliant premium, executable quote, unsigned swap construction, and a `SUCCESS` Transaction API simulation. Broadcasting is disabled.

## 90-second demo

1. Open the dashboard and show SEDGon at $61.89 versus ratio-adjusted fair value near $61.97.
2. Show that the apparent discount is only about 13.7 bps after applying `tokenToShareRatio`.
3. Point to `underlying-market-closed`; the agent will not treat a frozen reference as an entry signal.
4. Show the remaining quote, calldata, and simulation gates.
5. Switch to live mode with Binance credentials, select a BSC RWA, obtain the aggregated quote, build unsigned calldata, and simulate.
6. Close on the wallet boundary: `REVIEW` still does not broadcast; the user remains the signer.

## Validation

- Five focused tests pass.
- The HMAC test proves the signed path contains the required `/build` prefix.
- The fair-value test proves the issuer ratio is applied.
- The policy tests prove market closure and failed simulation block a trade.
- The bundled dashboard runs without credentials using the documented SEDGon fixture.

## Remaining account-bound work

1. Register for the hackathon and create a Binance Web3 API project.
2. Record credentialed endpoint latency and errors in `DX-LOG.md`.
3. Run a small BSC mainnet quote and Transaction API simulation.
4. Publish the public repository and optional four-minute demo.
5. Submit before 2026-10-11.
