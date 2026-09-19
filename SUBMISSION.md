# BNB Chain Tokenized Stocks Hackathon submission

## Project

**Name:** Closing Bell Agent

**Public repository:** <https://github.com/daveaire/closing-bell-agent>

**Demo video:** <https://youtu.be/xbSmqcgqq2s> (unlisted, natural neural narration)

**Track:** Main track — tokenized stocks on BSC

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

1. Complete the owner-authored Developer Experience Report.
2. Submit the final project before 2026-10-11.

Registration was recorded on 2026-09-19 and the public repository is live.

The published demo is <https://youtu.be/xbSmqcgqq2s>. The local source artifact is `demo-output/closing-bell-agent-demo.mp4` (2:32, 1280×720 H.264/AAC, SHA-256 `6dc46b4641838b22e473455e68a08a695037571e7b45f07f28297547143d16f7`).
